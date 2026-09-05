"""The Desk — six specialists reviewing one client, and where they disagree.

Every conflict here is computed, not scripted. A detector states a finding on
the evidence; the Relationship agent objects on the evidence in the notes; the
gate decides. The interesting cases are the ones where the gate does *not*
simply pass the finding through:

    reframe     the finding is right, the framing is not
    hold        a legal or explicit instruction blocks it
    authorised  the client instructed it in writing — it was never a breach

`conflicts` returns both sides of each of those, so the UI can show them facing
each other rather than burying the objection inside a card.
"""

from __future__ import annotations

import engine
from agents.base import cache_stats
from detectors.exposure import cluster
from loader import CLIENT_BY_ID, clients
from schemas import Finding

# The gate verdicts that mean an agent was overruled or excused.
CONTESTED = {"reframe", "hold", "authorised"}

VERDICT_MEANING = {
    "reframe": "Say it, but not the way the detector phrased it.",
    "hold": "Do not raise it yet. Not dropped — deferred, with a reason.",
    "authorised": "Not a breach at all. The client instructed it in writing.",
    "raise": "Nothing blocks it. Say it plainly.",
}

def _objection(rel: dict, finding: Finding) -> dict:
    """Find the relationship fact that produced this gate verdict."""
    for c in rel.get("constraints", []):
        if c["text"] and c["text"] in finding.gate_reason:
            return {
                "text": c["text"],
                "kind": c.get("kind", "human"),
                "revisit": c.get("revisit"),
            }
    # authorised, or a gate reason assembled from the entry point
    return {
        "text": finding.gate_reason,
        "kind": "documented" if finding.gate == "authorised" else "human",
        "revisit": finding.revisit,
    }


def _note_evidence(rel: dict, objection: dict) -> dict | None:
    """The dated, attributed note the objection rests on."""
    said = rel.get("said", [])
    if not said:
        return None
    # prefer the note that shares the most distinctive words with the objection
    words = {w for w in objection["text"].lower().split() if len(w) > 5}
    best, score = said[0], 0
    for note in said:
        overlap = len(words & set(note["quote"].lower().split()))
        if overlap > score:
            best, score = note, overlap
    return {
        "id": best["id"],
        "date": best["date"],
        "channel": best["channel"],
        "quote": best["quote"],
    }


def conflicts(client_id: str) -> list[dict]:
    """Every finding where the gate did not simply pass the detector through."""
    res = engine.run_client(client_id)
    rel = res["relationship"]
    out = []

    for f in res["findings"]:
        if f.gate not in CONTESTED:
            continue
        objection = _objection(rel, f)
        out.append(
            {
                "findingId": f.id,
                "claim": {
                    "agent": f.agent,
                    "severity": f.severity,
                    "title": f.title,
                    "headline": f.headline,
                    "evidence": [
                        {"source": e.source, "ref": e.ref, "detail": e.detail}
                        for e in f.evidence
                        if e.kind != "note"
                    ][:2],
                },
                "objection": {
                    **objection,
                    "agent": "relationship",
                    "evidence": _note_evidence(rel, objection),
                },
                "verdict": {
                    "gate": f.gate,
                    "meaning": VERDICT_MEANING[f.gate],
                    "reason": f.gate_reason,
                    "revisit": f.revisit,
                },
                "action": rel.get("entry_point"),
            }
        )
    return out


def desk(client_id: str) -> dict:
    """Everything the Desk screen needs for one client."""
    c = CLIENT_BY_ID[client_id]
    res = engine.run_client(client_id)
    rel = res["relationship"]
    cl = cluster(client_id)

    by_agent: dict[str, list[dict]] = {}
    for f in res["findings"]:
        by_agent.setdefault(f.agent, []).append(
            {"id": f.id, "title": f.title, "headline": f.headline, "gate": f.gate}
        )

    return {
        "client": {
            "id": client_id,
            "name": c["client_name"],
            "language": c["reporting_language"],
            "tenureYears": rel["tenure_years"],
            "lifeStage": c["life_stage"],
            "sourceOfWealth": c["source_of_wealth"],
            "riskProfile": f"{c['risk_profile']} · {c['risk_tolerance_score']}/10",
            "headline": cl["label"] if cl["core"] else None,
        },
        # real measured timings, straight from the engine run
        "trace": res["trace"],
        "findingsByAgent": by_agent,
        "conflicts": conflicts(client_id),
        "constraints": rel["constraints"],
        "cache": cache_stats(),
    }


def roster() -> list[dict]:
    """Which clients have a contested finding worth opening the Desk on."""
    out = []
    for cid in clients["client_id"]:
        res = engine.run_client(cid)
        contested = [f for f in res["findings"] if f.gate in CONTESTED]
        if not contested:
            continue
        top = contested[0]
        out.append(
            {
                "id": cid,
                "name": CLIENT_BY_ID[cid]["client_name"],
                "conflicts": len(contested),
                "gate": top.gate,
                "summary": top.gate_reason[:110],
            }
        )
    out.sort(key=lambda r: (r["gate"] != "hold", -r["conflicts"]))
    return out
