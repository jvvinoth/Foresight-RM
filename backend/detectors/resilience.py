"""Resilience — what breaks first?

Two things a current-state view cannot show:

  * A breach that has already happened and then cleared. The dataset contains
    a facility that breached its trigger for two consecutive snapshots and was
    cured by collateral prices rising, not by anyone acting. That distinction
    matters: a breach cured by an event will return when the event does.
  * A liquidity plan that assumes gated assets are sellable. There is a worked
    precedent in the data of a redemption request met at 22%.
"""

from __future__ import annotations

from config import SHOCKS, SNAPSHOTS, TODAY
from loader import (
    client_holdings,
    commitments,
    credit_facilities,
    events_between,
    planned_cash_needs,
    to_usd,
)
from schemas import Evidence, Finding, Metric

GATED_TIERS = {"Illiquid", "Quarterly Gate", "Monthly"}
DAILY_TIERS = {"Daily"}


def ltv_path(fac) -> list[dict]:
    trigger = float(fac["margin_call_ltv_pct"])
    return [
        {
            "date": d,
            "ltv": float(fac[f"ltv_pct_{d}"]),
            "drawn": float(fac[f"drawn_{d}"]),
            "collateral": float(fac[f"collateral_market_value_{d}"]),
            "headroom": float(fac[f"headroom_{d}"]),
            "breach": float(fac[f"ltv_pct_{d}"]) > trigger,
        }
        for d in SNAPSHOTS
    ]


def shocks(fac) -> list[dict]:
    """LTV under a collateral shock. drawn / (lending_value * (1+shock))."""
    lending = float(fac[f"lending_value_{TODAY}"])
    drawn = float(fac[f"drawn_{TODAY}"])
    trigger = float(fac["margin_call_ltv_pct"])
    out = []
    for s in SHOCKS:
        lv = lending * (1 + s)
        ltv = drawn / lv * 100 if lv else 0.0
        out.append(
            {
                "shock": "Today" if s == 0 else f"{int(s * 100)}%",
                "ltv": round(ltv, 2),
                "breach": ltv > trigger,
            }
        )
    return out


def facility_view(client_id: str) -> dict | None:
    fac = credit_facilities[credit_facilities["client_id"] == client_id]
    if not len(fac):
        return None
    f0 = fac.iloc[0]
    path = ltv_path(f0)
    return {
        "facilityId": str(f0["facility_id"]),
        "currency": str(f0["facility_ccy"]),
        "trigger": float(f0["margin_call_ltv_pct"]),
        "ltv": float(f0[f"ltv_pct_{TODAY}"]),
        "headroom": float(f0[f"headroom_{TODAY}"]),
        "drawn": float(f0[f"drawn_{TODAY}"]),
        "path": path,
        "shocks": shocks(f0),
    }


def detect(client_id: str) -> list[Finding]:
    out: list[Finding] = []
    fac = credit_facilities[credit_facilities["client_id"] == client_id]

    if len(fac):
        f0 = fac.iloc[0]
        trigger = float(f0["margin_call_ltv_pct"])
        path = ltv_path(f0)
        today = path[-1]
        past_breaches = [p for p in path[:-1] if p["breach"]]
        sh = shocks(f0)
        first_break = next((s for s in sh if s["breach"]), None)
        ccy = str(f0["facility_ccy"])

        # a breach that cleared without the drawn amount changing was cured by
        # the market, not by an action
        if past_breaches and not today["breach"]:
            drawn_unchanged = abs(past_breaches[0]["drawn"] - today["drawn"]) < 1
            coll_from = past_breaches[0]["collateral"]
            coll_to = today["collateral"]
            window = events_between(past_breaches[-1]["date"], TODAY)
            top_event = (
                window.sort_values("severity").iloc[0] if len(window) else None
            )
            ev = [
                Evidence(
                    "file",
                    "credit_facilities.csv",
                    str(f0["facility_id"]),
                    (
                        f"LTV {past_breaches[0]['ltv']:.2f}% on {past_breaches[0]['date']} "
                        f"against a {trigger:.2f}% trigger; drawn "
                        f"{'unchanged' if drawn_unchanged else 'changed'} at "
                        f"{ccy} {today['drawn']:,.0f}"
                    ),
                )
            ]
            if top_event is not None:
                ev.append(
                    Evidence(
                        "event",
                        "event_log.csv",
                        f"{top_event['event_date']} · severity {top_event['severity']}",
                        str(top_event["description"])[:160],
                    )
                )
            out.append(
                Finding(
                    id=f"RES-CURED-{client_id}",
                    client_id=client_id,
                    agent="resilience",
                    tense="now",
                    severity="high",
                    title="A margin breach cured by an event, not an action",
                    headline=(
                        f"LTV was {past_breaches[0]['ltv']:.2f}% against a {trigger:.0f}% trigger. "
                        "Nobody fixed it — collateral prices did."
                    ),
                    body=(
                        f"The facility breached its trigger at {len(past_breaches)} snapshot(s). "
                        f"The drawn amount {'never changed' if drawn_unchanged else 'moved'}: "
                        f"{ccy} {today['drawn']:,.0f}. What changed was the collateral, from "
                        f"{coll_from:,.0f} to {coll_to:,.0f}. The breach cleared without a single "
                        "action being taken, which means it returns if the move that cured it "
                        f"unwinds — the position is back over the trigger at a "
                        f"{first_break['shock'] if first_break else 'large'} collateral fall."
                    ),
                    evidence=ev,
                    metrics=[
                        Metric(
                            p["date"][:7],
                            f"{p['ltv']:.2f}%",
                            alert=p["breach"],
                            sub="Breach" if p["breach"] else None,
                        )
                        for p in path
                    ],
                    materiality=0.8,
                    urgency=0.55,
                )
            )

        # proximity to the trigger today
        margin = trigger - today["ltv"]
        if 0 < margin <= 6 or today["breach"]:
            out.append(
                Finding(
                    id=f"RES-LTV-{client_id}",
                    client_id=client_id,
                    agent="resilience",
                    tense="next",
                    severity="critical" if margin <= 2 or today["breach"] else "high",
                    title=(
                        "Loan-to-value is in breach"
                        if today["breach"]
                        else f"A {first_break['shock'] if first_break else 'small'} fall triggers the margin call"
                    ),
                    headline=(
                        f"LTV is {today['ltv']:.2f}% against a {trigger:.2f}% trigger — "
                        f"{margin:.2f} points of headroom."
                    ),
                    body=(
                        f"Drawn {ccy} {today['drawn']:,.0f} against lending value after advance-rate "
                        f"haircuts. Headroom is {ccy} {today['headroom']:,.0f}. "
                        + (
                            f"A {first_break['shock']} fall in collateral value takes LTV to "
                            f"{first_break['ltv']:.2f}%. "
                            if first_break
                            else ""
                        )
                        + "Where the collateral is also the concentration, selling it to raise cash "
                        "raises the ratio rather than lowering it."
                    ),
                    evidence=[
                        Evidence(
                            "file",
                            "credit_facilities.csv",
                            f"{f0['facility_id']} · {len(SNAPSHOTS)} snapshots",
                            f"margin_call_ltv_pct {trigger:.2f}, LTV computed as drawn / lending value",
                        )
                    ],
                    metrics=[
                        Metric("LTV today", f"{today['ltv']:.2f}%", alert=True, sub=f"Trigger {trigger:.2f}%"),
                        Metric("Headroom", f"{ccy} {today['headroom'] / 1e6:.1f}m"),
                    ]
                    + (
                        [
                            Metric(
                                f"At {first_break['shock']}",
                                f"{first_break['ltv']:.2f}%",
                                alert=True,
                                sub="Margin call",
                            )
                        ]
                        if first_break
                        else []
                    ),
                    materiality=0.85,
                    # scales with how close the trigger is: 0.59 points of
                    # headroom is materially more urgent than 5 points
                    urgency=round(min(1.0, max(0.35, 1 - margin / 6)), 3),
                )
            )

    # liquidity: confirmed needs against what is genuinely sellable
    h = client_holdings(client_id)
    daily = float(h[h["liquidity_tier"].isin(DAILY_TIERS)]["market_value_usd"].sum())
    gated = float(h[h["liquidity_tier"].isin(GATED_TIERS)]["market_value_usd"].sum())

    needs = planned_cash_needs[planned_cash_needs["client_id"] == client_id]
    near = needs[needs["due_from"] <= "2026-12-31"]
    need_usd = sum(to_usd(float(r["amount"]), str(r["currency"])) for _, r in near.iterrows())
    comm = commitments[commitments["client_id"] == client_id]
    uncalled = sum(to_usd(float(r["uncalled"]), str(r["currency"])) for _, r in comm.iterrows())
    total_due = need_usd + uncalled

    if total_due > 0 and daily < total_due:
        rows = [f"{r['currency']} {float(r['amount']):,.0f} — {r['description']}" for _, r in near.iterrows()]
        out.append(
            Finding(
                id=f"RES-LIQ-{client_id}",
                client_id=client_id,
                agent="resilience",
                tense="next",
                severity="critical" if daily < total_due * 0.5 else "high",
                title="Commitments exceed what is genuinely sellable",
                headline=(
                    f"USD {total_due / 1e6:.1f}m falls due against USD {daily / 1e6:.1f}m of "
                    "daily-liquid assets."
                ),
                body=(
                    f"Confirmed and expected needs to end-2026 total USD {need_usd / 1e6:.1f}m, plus "
                    f"USD {uncalled / 1e6:.1f}m of uncalled commitments. Daily-liquid assets are "
                    f"USD {daily / 1e6:.1f}m; a further USD {gated / 1e6:.1f}m sits in illiquid or "
                    "gated positions and cannot be relied on. A redemption request elsewhere in the "
                    "book was met at 22% when the manager applied a quarterly gate, so gated assets "
                    "are treated here as unavailable rather than slow."
                ),
                evidence=[
                    Evidence("file", "planned_cash_needs.csv", f"{len(near)} row(s)", "; ".join(rows)[:240]),
                    Evidence(
                        "file",
                        "transactions.csv",
                        "12 May 2026 · Redemption Request",
                        "Manager applied the quarterly gate. Estimated 22% of the request met.",
                    ),
                ],
                metrics=[
                    Metric("Due", f"USD {total_due / 1e6:.1f}m", alert=True),
                    Metric("Daily liquid", f"USD {daily / 1e6:.1f}m", alert=daily < total_due),
                    Metric("Gated or illiquid", f"USD {gated / 1e6:.1f}m", sub="Not relied on"),
                ],
                materiality=min(1.0, total_due / max(daily, 1) / 3),
                urgency=0.75,
            )
        )

    return out
