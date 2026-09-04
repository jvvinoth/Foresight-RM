"""Monitor — what changed since you last looked?

Everything else in this system computes current state. This one diffs the
snapshots, which is what "continuously monitors" actually means: change, not
value. It also catches the opposite of change — a mark that has not moved at
all while everything around it has.
"""

from __future__ import annotations

from config import PRIOR, SNAPSHOTS, TODAY
from loader import (
    client_holdings,
    client_total_usd,
    events_between,
    instrument,
    transactions,
)
from schemas import Evidence, Finding, Metric


def detect(client_id: str) -> list[Finding]:
    out: list[Finding] = []

    now = client_holdings(client_id, TODAY)
    then = client_holdings(client_id, PRIOR)
    if not len(now) or not len(then):
        return out

    now_total = client_total_usd(client_id, TODAY)
    then_total = client_total_usd(client_id, PRIOR)
    move_pct = (now_total / then_total - 1) * 100 if then_total else 0.0

    # ------------------------------------------------------ stale marking
    for _, r in now.iterrows():
        val_date = str(r.get("valuation_date", ""))[:10]
        if not val_date or val_date == TODAY:
            continue
        pct = float(r["market_value_usd"]) / (now_total or 1) * 100
        if pct < 15:
            continue

        prices = {
            d: float(instrument(r["instrument_id"]).get(f"price_{d}", 0) or 0) for d in SNAPSHOTS
        }
        unchanged = len({round(v, 6) for v in prices.values() if v}) == 1

        tx = transactions[
            (transactions["client_id"] == client_id)
            & (transactions["transaction_type"] == "Valuation Update")
        ]
        reviewed = str(tx.iloc[0]["narrative"]) if len(tx) else None

        out.append(
            Finding(
                id=f"MON-STALE-{client_id}",
                client_id=client_id,
                agent="monitor",
                tense="now",
                severity="medium",
                title="A price that has not moved",
                headline=(
                    f"{pct:.2f}% of wealth is marked at {val_date} and is "
                    f"{'identical across all five snapshots' if unchanged else 'unchanged since'}."
                ),
                body=(
                    f"{r['instrument_name']} carries a valuation date of {val_date} while the "
                    f"snapshot date is {TODAY}. Private marks lag by design, so this is not an "
                    "error. It is worth saying out loud that a large share of this client's wealth "
                    "rests on a valuation nobody has challenged in that time — particularly where "
                    "they are borrowing against the rest."
                    + (f" Latest review: {reviewed}" if reviewed else "")
                ),
                evidence=[
                    Evidence(
                        "file",
                        "holdings.csv",
                        f"valuation_date {val_date}",
                        f"{r['instrument_name']} · liquidity tier {r['liquidity_tier']}",
                    )
                ]
                + (
                    [Evidence("file", "transactions.csv", "Valuation Update", reviewed)]
                    if reviewed
                    else []
                ),
                metrics=[
                    Metric("Share of wealth", f"{pct:.2f}%", alert=True),
                    Metric("Valuation date", val_date, alert=True, sub="Snapshot " + TODAY),
                ],
                materiality=min(1.0, pct / 60),
                urgency=0.3,
            )
        )
        break

    # ------------------------------------------------- move since last look
    if abs(move_pct) >= 3:
        window = events_between(PRIOR, TODAY)
        top = window.sort_values("severity").head(2)
        out.append(
            Finding(
                id=f"MON-MOVE-{client_id}",
                client_id=client_id,
                agent="monitor",
                tense="now",
                severity="medium" if abs(move_pct) < 8 else "high",
                title=f"Portfolio {'up' if move_pct > 0 else 'down'} {abs(move_pct):.1f}% since {PRIOR}",
                headline=(
                    f"USD {then_total / 1e6:.1f}m → USD {now_total / 1e6:.1f}m across the last "
                    "two snapshots."
                ),
                body=(
                    f"{len(window)} logged market event(s) fall in this window. Attribution is "
                    "reported only against the approved event log; no market narrative is generated."
                ),
                evidence=[
                    Evidence(
                        "event",
                        "event_log.csv",
                        f"{e['event_date']} · {e['event_type']} · severity {e['severity']}",
                        f"{str(e['description'])[:140]} — transmission: {e['primary_transmission']}",
                    )
                    for _, e in top.iterrows()
                ],
                metrics=[
                    Metric("Change", f"{move_pct:+.1f}%", alert=move_pct < 0),
                    Metric("Now", f"USD {now_total / 1e6:.1f}m"),
                ],
                materiality=min(1.0, abs(move_pct) / 15),
                urgency=0.35,
            )
        )

    return out
