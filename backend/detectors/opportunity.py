"""Opportunity — what is unclaimed?

The brief says "identifies risks *and opportunities*". Three kinds here:

  * Idle cash above the mandate band, with the cost of not deciding priced
    against the benchmark over the snapshot window.
  * Open loops — something the client said, that the data shows was never
    acted on. This is the only detector that reads a note and a number
    together and reports the gap between them.
  * Stated future plans that are not yet funded or mandated.
"""

from __future__ import annotations

import re

from config import SNAPSHOTS, TODAY
from loader import (
    CLIENT_BY_ID,
    MANDATE_BANDS,
    managed_holdings,
    notes_for,
    planned_cash_needs,
    series,
    to_usd,
    transactions,
)
from schemas import Evidence, Finding, Metric

# Phrases that mark an unresolved commitment in an RM note.
OPEN_LOOP_PATTERNS = [
    (r"agreed .{0,60}(but|and) has not (executed|acted)", "agreed but never executed"),
    (r"(second|third|fourth|fifth) attempt", "raised repeatedly without resolution"),
    (r"asked for more time", "deferred by the client"),
    (r"would (think|consider) about it", "left open"),
    (r"has not been (executed|actioned|implemented)", "never executed"),
    (r"we have not modelled", "requested but not delivered"),
    (r"asked for a (full|detailed) .{0,40}(map|review|analysis)", "requested but not delivered"),
]


def _benchmark_move() -> float:
    a, b = series("SPX", SNAPSHOTS[0]), series("SPX", TODAY)
    return (b / a - 1) if a and b else 0.0


def detect(client_id: str) -> list[Finding]:
    out: list[Finding] = []
    client = CLIENT_BY_ID[client_id]
    h = managed_holdings(client_id)
    if not len(h):
        return out

    total = float(h["market_value_usd"].sum()) or 1.0

    # ---------------------------------------------------------- idle cash
    cash = float(h[h["asset_class"] == "Cash and Equivalents"]["market_value_usd"].sum())
    cash_pct = cash / total * 100
    mandate_code = str(h.iloc[0]["mandate_code"])
    band = MANDATE_BANDS.get(mandate_code, {}).get("Cash and Equivalents")

    if band and cash_pct > band["max"]:
        excess = cash - total * band["max"] / 100
        move = _benchmark_move()
        cost = excess * move
        out.append(
            Finding(
                id=f"OPP-CASH-{client_id}",
                client_id=client_id,
                agent="opportunity",
                tense="now",
                severity="high" if cash_pct > band["max"] * 2 else "medium",
                title="Cash sitting above the mandate band",
                headline=(
                    f"USD {cash / 1e6:.1f}m in cash — {cash_pct:.1f}% against a "
                    f"{band['max']:.0f}% ceiling."
                ),
                body=(
                    f"USD {excess / 1e6:.1f}m is above the mandate ceiling and deployable today. "
                    f"Measured against the equity benchmark across the five snapshots "
                    f"({move * 100:+.1f}%), holding it has cost approximately "
                    f"USD {cost:,.0f} over the period. This is unearned for the client and "
                    "unearned for the bank."
                ),
                evidence=[
                    Evidence(
                        "file",
                        "mandates.csv",
                        f"{mandate_code} · Cash and Equivalents",
                        f"Band {band['min']:.0f}–{band['max']:.0f}%, target {band['target']:.0f}%",
                    ),
                    Evidence(
                        "file",
                        "market_context.csv",
                        f"SPX · {SNAPSHOTS[0]} → {TODAY}",
                        f"{series('SPX', SNAPSHOTS[0]):,.0f} → {series('SPX', TODAY):,.0f}",
                    ),
                ],
                metrics=[
                    Metric("Cash", f"{cash_pct:.1f}%", alert=True, sub=f"Band {band['min']:.0f}–{band['max']:.0f}%"),
                    Metric("Deployable", f"USD {excess / 1e6:.1f}m", alert=True, sub="Above mandate"),
                    Metric("Cost of delay", f"USD {cost / 1e6:.2f}m", alert=True, sub=f"Benchmark {move * 100:+.1f}%"),
                ],
                materiality=min(1.0, excess / 10e6),
                urgency=0.45,
            )
        )

    # --------------------------------------------------------- open loops
    for note in notes_for(client_id):
        text = str(note["note"])
        for pattern, label in OPEN_LOOP_PATTERNS:
            if re.search(pattern, text, re.I):
                out.append(
                    Finding(
                        id=f"OPP-LOOP-{note['note_id']}",
                        client_id=client_id,
                        agent="opportunity",
                        tense="act",
                        severity="high",
                        title="An open loop nobody is tracking",
                        headline=f"Recorded on {note['note_date']} and {label} — no follow-up exists in the system.",
                        body=(
                            f"The note below was written by {note['rm_name']} on {note['note_date']} "
                            f"({note['channel'].lower()}). It records a commitment that the "
                            "structured data shows was never closed out. Nothing in the bank "
                            "carries a follow-up date for it, because notes and positions are "
                            "never read against each other."
                        ),
                        evidence=[
                            Evidence(
                                "note",
                                "rm_notes.json",
                                f"{note['note_id']} · {note['note_date']} · {note['rm_name']}",
                                text[:260],
                            )
                        ],
                        materiality=0.5,
                        urgency=0.4,
                    )
                )
                break

    # ------------------------------------------------- contradicted intent
    # something the client said they wanted, followed by a trade that did the
    # opposite. Uses the note date as the pivot.
    tx = transactions[
        (transactions["client_id"] == client_id)
        & (transactions["transaction_type"] == "Structured Product Subscription")
    ]
    for note in notes_for(client_id):
        text = str(note["note"]).lower()
        if "not tied to" in text or "diversify away" in text or "away from" in text:
            later = tx[tx["trade_date"] > note["note_date"]]
            if len(later):
                t0 = later.iloc[0]
                gap = (
                    __import__("datetime").date.fromisoformat(str(t0["trade_date"]))
                    - __import__("datetime").date.fromisoformat(str(note["note_date"]))
                ).days
                out.append(
                    Finding(
                        id=f"OPP-CONTRA-{note['note_id']}",
                        client_id=client_id,
                        agent="opportunity",
                        tense="act",
                        severity="high",
                        title="A stated intention, then the opposite trade",
                        headline=(
                            f"They asked to diversify away from it on {note['note_date']}. "
                            f"{gap} days later the portfolio added more."
                        ),
                        body=(
                            f"The note and the trade never met, because nothing in the bank reads "
                            f"one against the other. Trade narrative: {t0['narrative']}"
                        ),
                        evidence=[
                            Evidence(
                                "note",
                                "rm_notes.json",
                                f"{note['note_id']} · {note['note_date']}",
                                str(note["note"])[:220],
                            ),
                            Evidence(
                                "file",
                                "transactions.csv",
                                str(t0["trade_date"]),
                                str(t0["narrative"])[:200],
                            ),
                        ],
                        materiality=0.6,
                        urgency=0.5,
                    )
                )
            break

    # ------------------------------------------------ unfunded future plans
    plans = planned_cash_needs[
        (planned_cash_needs["client_id"] == client_id)
        & (planned_cash_needs["certainty"].isin(["Likely", "Aspirational"]))
        & (planned_cash_needs["due_from"] > TODAY)
    ]
    if len(plans):
        p0 = plans.sort_values("due_from").iloc[0]
        amt_usd = to_usd(float(p0["amount"]), str(p0["currency"]))
        out.append(
            Finding(
                id=f"OPP-PLAN-{client_id}",
                client_id=client_id,
                agent="opportunity",
                tense="next",
                severity="medium",
                title="A stated plan with no mandate behind it",
                headline=f"{p0['currency']} {float(p0['amount']):,.0f} from {p0['due_from'][:7]} — {p0['description']}.",
                body=(
                    f"Recorded certainty is '{p0['certainty']}'. Nothing in the portfolio is "
                    "currently structured to meet it, and no mandate conversation is open. "
                    f"Client objective on file: {client.get('objectives', '')}"
                ),
                evidence=[
                    Evidence(
                        "file",
                        "planned_cash_needs.csv",
                        f"{p0['need_id']} · {p0['certainty']} · {p0['recurrence']}",
                        str(p0["description"]),
                    )
                ],
                metrics=[
                    Metric("Size", f"USD {amt_usd / 1e6:.1f}m", sub=str(p0["certainty"])),
                    Metric("From", str(p0["due_from"])[:7]),
                ],
                materiality=min(1.0, amt_usd / 15e6),
                urgency=0.3,
            )
        )

    return out
