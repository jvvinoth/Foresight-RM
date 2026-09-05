"""Runs every agent for a client, passes findings through the gate, ranks them.

Cached per client because the dataset is static — the whole book is computed
once on first request and reused, which is also what makes the demo immune to
a slow network.
"""

from __future__ import annotations

import time
from functools import lru_cache

from agents import relationship
from detectors import exposure, monitor, opportunity, resilience, suitability
from gate import apply as gate_apply
from gate import score as gate_score
from loader import CLIENT_BY_ID, SUMMARY, clients
from schemas import Finding

DETECTORS = [
    ("monitor", monitor.detect),
    ("exposure", exposure.detect),
    ("resilience", resilience.detect),
    ("opportunity", opportunity.detect),
    ("suitability", suitability.detect),
]

TENSE_ORDER = {"now": 0, "next": 1, "act": 2}


@lru_cache(maxsize=None)
def run_client(client_id: str) -> dict:
    trace = []
    findings: list[Finding] = []

    for name, fn in DETECTORS:
        t0 = time.perf_counter()
        found = fn(client_id)
        trace.append(
            {
                "agent": name,
                "ms": round((time.perf_counter() - t0) * 1000, 1),
                "found": len(found),
                "kind": "deterministic",
            }
        )
        findings.extend(found)

    t0 = time.perf_counter()
    rel = relationship.profile(client_id)
    trace.append(
        {
            "agent": "relationship",
            "ms": round((time.perf_counter() - t0) * 1000, 1),
            "found": len(rel["constraints"]),
            "kind": "model",
        }
    )

    for f in findings:
        gate_apply(f, rel)

    findings.sort(
        key=lambda f: (-gate_score(f), TENSE_ORDER.get(f.tense, 9)),
    )

    return {
        "client_id": client_id,
        "relationship": rel,
        "findings": findings,
        "trace": trace,
        "score": round(max((gate_score(f) for f in findings), default=0.0), 1),
    }


@lru_cache(maxsize=1)
def run_book() -> list[dict]:
    rows = []
    for cid in clients["client_id"]:
        res = run_client(cid)
        c = CLIENT_BY_ID[cid]
        top = res["findings"][0] if res["findings"] else None
        rows.append(
            {
                "id": cid,
                "name": c["client_name"],
                "aumUsd": float(c["total_aum_usd"]),
                "wealthBand": c["wealth_band"],
                "language": c["reporting_language"],
                "score": res["score"],
                "gate": top.gate if top else "hold",
                "reason": (
                    top.headline
                    if top
                    else "Monitored. No finding above threshold this cycle."
                ),
                "findings": len(res["findings"]),
                "lastContactDays": res["relationship"]["last_contact_days"],
                "kycOverdue": res["relationship"]["kyc_overdue"],
                "kycDue": str(c["kyc_review_due"]),
                # relationship contributes constraints rather than findings,
                # so it is credited when it actually shaped the gate
                "agents": sorted(
                    {f.agent for f in res["findings"]}
                    | ({"relationship"} if res["relationship"]["constraints"] else set())
                ),
            }
        )
    rows.sort(key=lambda r: -r["score"])
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return rows


def book_stats() -> list[dict]:
    rows = run_book()
    total_findings = sum(r["findings"] for r in rows)
    raise_now = sum(1 for r in rows if r["gate"] == "raise")
    held = sum(1 for r in rows if r["gate"] == "hold")

    # What the unstructured file is doing. Everyone gets the same 28 notes;
    # almost nobody reads them against the numbers, so this is worth saying.
    contested = {"reframe", "hold", "authorised"}
    changed = sum(
        1
        for cid in clients["client_id"]
        if any(f.gate in contested for f in run_client(cid)["findings"])
    )

    idle = 0.0
    for cid in clients["client_id"]:
        for f in run_client(cid)["findings"]:
            if f.id.startswith("OPP-CASH"):
                for m in f.metrics:
                    if m.label == "Deployable":
                        idle += float(m.value.replace("USD ", "").replace("m", "")) * 1e6

    return [
        {"label": "Clients monitored", "value": str(len(rows)), "sub": f"{SUMMARY['portfolios']} portfolios · {SUMMARY['positions']} positions"},
        {"label": "Findings this cycle", "value": str(total_findings), "sub": "Across 6 agents"},
        {"label": "Raise now", "value": str(raise_now), "sub": "Nothing blocks the conversation", "tone": "critical"},
        {"label": "Held", "value": str(held), "sub": "With reason and revisit date", "tone": "good"},
        {
            "label": "Idle cash above mandate",
            "value": f"USD {idle / 1e6:.2f}m",
            "sub": "Deployable today",
            "tone": "gold",
        },
        {
            "label": "Notes changed the answer",
            "value": f"{changed} of {len(rows)}",
            "sub": f"{SUMMARY['notes']} RM notes read this cycle",
            "tone": "gold",
        },
    ]
