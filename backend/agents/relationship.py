"""Relationship — how should she say it, and should she?

Reads the RM notes and the client record and returns structured relationship
facts: language, tenure, what the client said, what constrains the
conversation. The only agent whose output can override another agent's.

Constraints carry two flags:
  blocking  — a legal or explicit instruction. Nothing may be raised.
  sensitive — the finding is right, the framing is not.

Deterministic rules cover the constraints the dataset states outright
(closed periods, "no changes for now"). The model is used to summarise tone
and pick an entry point, and everything it returns is cached.
"""

from __future__ import annotations

import re
from datetime import date

from config import TODAY
from loader import CLIENT_BY_ID, notes_for, planned_cash_needs
from agents.base import run_agent

SCHEMA = {
    "type": "object",
    "properties": {
        "tone": {"type": "string", "description": "One sentence on how to speak to this client."},
        "entry_point": {
            "type": "string",
            "description": "The neutral subject to open on when a finding is sensitive. Empty if none.",
        },
        "avoid": {"type": "string", "description": "What not to lead with, and why. Empty if nothing."},
    },
    "required": ["tone", "entry_point", "avoid"],
}

# Phrases in the notes that constrain what can be raised.
BLOCKING = [
    (
        r"dealing restrictions|closed period",
        "Board member in a closed period — no dealing is permitted.",
        True,
    ),
    (
        r"asked that we not make any changes|not make any changes for now",
        "The client has asked that no changes be made for now.",
        True,
    ),
    (r"asked for more time", "The client asked for more time on this. Do not press again yet.", True),
]

SENSITIVE = [
    (r"grieving|following the death|widow", "Recently bereaved — approach with care."),
    (
        r"read as a signal by his uncles|family politics|would be read as",
        "Family politics: reducing the legacy holding would be read as a signal by the family.",
    ),
    (r"emotional attachment", "Emotional attachment to the position — do not argue the numbers."),
    (
        r"keeps returning to the fact that the numbers are red|does not understand",
        "Needs reassurance rather than education. Do not re-explain the mechanics.",
    ),
    (
        r"convinced|why he is confident|firm on",
        "Strong personal conviction on file — a direct challenge reads as questioning their judgement.",
    ),
]

WINDOW_RE = re.compile(r"next open window is (\w+ \d{4})", re.I)


def _tenure_years(since: str) -> int:
    y = date.fromisoformat(TODAY).year - date.fromisoformat(since).year
    return max(0, y)


def _days_since_contact(client_id: str) -> int | None:
    notes = notes_for(client_id)
    if not notes:
        return None
    last = max(n["note_date"] for n in notes)
    return (date.fromisoformat(TODAY) - date.fromisoformat(last)).days


def profile(client_id: str) -> dict:
    c = CLIENT_BY_ID[client_id]
    notes = notes_for(client_id)
    blob = " ".join(str(n["note"]) for n in notes)

    constraints: list[dict] = []
    for pattern, text, _ in BLOCKING:
        if re.search(pattern, blob, re.I):
            revisit = None
            if m := WINDOW_RE.search(blob):
                revisit = m.group(1)
            constraints.append({"text": text, "blocking": True, "revisit": revisit})
    for pattern, text in SENSITIVE:
        if re.search(pattern, blob, re.I):
            constraints.append({"text": text, "sensitive": True})

    # a confirmed, near-dated obligation is the safest way into a hard subject
    needs = planned_cash_needs[
        (planned_cash_needs["client_id"] == client_id)
        & (planned_cash_needs["certainty"] == "Confirmed")
        & (planned_cash_needs["due_from"] >= TODAY)
    ].sort_values("due_from")
    entry = None
    if len(needs):
        n0 = needs.iloc[0]
        entry = (
            f"the {n0['currency']} {float(n0['amount']):,.0f} {str(n0['description']).lower()} "
            f"due {n0['due_from']}"
        )

    said = [
        {
            "id": n["note_id"],
            "date": n["note_date"],
            "channel": n["channel"],
            "quote": str(n["note"]),
        }
        for n in notes
    ]

    fallback = {
        "tone": f"{c['reporting_language']} speaker, client since {str(c['client_since'])[:4]}.",
        "entry_point": entry or "",
        "avoid": constraints[0]["text"] if constraints else "",
    }

    llm = run_agent(
        "relationship",
        (
            "You are briefing a private banking Relationship Manager before a client meeting.\n"
            f"Client: {c['client_name']}, {c['life_stage']}, source of wealth "
            f"{c['source_of_wealth']}, reporting language {c['reporting_language']}, "
            f"client since {c['client_since']}.\n"
            f"Objectives on file: {c['objectives']}\n\n"
            "RM notes:\n"
            + "\n".join(f"[{n['note_date']}] {n['note']}" for n in notes)
            + "\n\nReturn tone guidance in one sentence, a neutral entry point for a difficult "
            "subject (or empty string), and what not to lead with (or empty string). "
            "Do not invent facts that are not in the notes."
        ),
        SCHEMA,
        inputs={"client": client_id, "notes": [n["note_id"] for n in notes]},
        fallback=fallback,
    )

    return {
        "client_id": client_id,
        "name": c["client_name"],
        "language": c["reporting_language"],
        "tenure_years": _tenure_years(str(c["client_since"])),
        "since": str(c["client_since"]),
        "last_contact_days": _days_since_contact(client_id),
        "kyc_due": str(c["kyc_review_due"]),
        "kyc_overdue": str(c["kyc_review_due"]) < TODAY,
        "source_of_wealth": c["source_of_wealth"],
        "life_stage": c["life_stage"],
        "risk_profile": c["risk_profile"],
        "risk_score": int(c["risk_tolerance_score"]),
        "objectives": c["objectives"],
        "residence": c["country_of_residence"],
        "tax_domicile": c["tax_domicile"],
        "cross_border": c["country_of_residence"] != c["tax_domicile"],
        "booking_centre": c["booking_centre"],
        "constraints": constraints,
        "entry_point": entry,
        "said": said,
        "tone": llm.get("tone", fallback["tone"]),
        "avoid": llm.get("avoid", fallback["avoid"]),
    }
