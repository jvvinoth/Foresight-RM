"""Narrator — turns findings into something an RM can say.

The narrator receives figures. It never produces them. Every number in its
output was computed by a detector and is repeated verbatim.
"""

from __future__ import annotations

from loader import CLIENT_BY_ID
from agents.base import run_agent
from schemas import Finding

BRIEF_SCHEMA = {
    "type": "object",
    "properties": {
        "open_with": {"type": "string", "description": "What to open the conversation on."},
        "do_not_lead_with": {"type": "string", "description": "What to avoid opening on, and why."},
        "one_number": {"type": "string", "description": "The single figure to have ready."},
    },
    "required": ["open_with", "do_not_lead_with", "one_number"],
}

DRAFT_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "body": {"type": "string", "description": "Client-facing message in the client's reporting language."},
    },
    "required": ["subject", "body"],
}


def brief(client_id: str, findings: list[Finding], rel: dict) -> dict:
    top = [f for f in findings if f.gate in {"raise", "reframe"}][:3]
    held = [f for f in findings if f.gate == "hold"]

    fallback = {
        "open_with": (
            f"{rel.get('entry_point', '').capitalize()}."
            if rel.get("entry_point")
            else (top[0].headline if top else "Nothing above threshold this cycle.")
        ),
        "do_not_lead_with": rel.get("avoid", "") or "No restriction on file.",
        "one_number": top[0].metrics[0].value if top and top[0].metrics else "—",
    }

    out = run_agent(
        "narrator-brief",
        (
            "Write a pre-meeting brief for a private banking Relationship Manager. "
            "Use only the figures given; do not compute or invent any number.\n\n"
            f"Client: {rel['name']} · {rel['language']} · client since {rel['since']}\n"
            f"Tone guidance: {rel.get('tone', '')}\n"
            f"Constraints: {[c['text'] for c in rel.get('constraints', [])]}\n"
            f"Neutral entry point: {rel.get('entry_point')}\n\n"
            "Findings:\n"
            + "\n".join(f"- [{f.gate}] {f.title}: {f.headline} ({f.gate_reason})" for f in top)
            + ("\nHeld: " + "; ".join(f.title for f in held) if held else "")
            + "\n\nReturn what to open with, what not to lead with and why, and the single "
            "figure the RM should have ready."
        ),
        BRIEF_SCHEMA,
        inputs={"client": client_id, "findings": [f.id for f in top]},
        fallback=fallback,
    )

    return {
        **out,
        "raise": [f.to_dict() for f in findings if f.gate in {"raise", "reframe"}],
        "held": [f.to_dict() for f in held],
        "language": rel["language"],
    }


def draft(client_id: str, findings: list[Finding], rel: dict) -> dict:
    """The one live model call in the demo — a client-facing message in their
    reporting language. Falls back to the cached version if unavailable."""
    c = CLIENT_BY_ID[client_id]
    top = [f for f in findings if f.gate in {"raise", "reframe"}][:2]

    fallback = {
        "subject": f"Portfolio review — {c['client_name']}",
        "body": (
            "A cached draft is not available for this client. Set ANTHROPIC_API_KEY to "
            "generate one live."
        ),
    }

    return run_agent(
        "narrator-draft",
        (
            f"Write a short, formal client message in {c['reporting_language']}. "
            "You are writing on behalf of a Julius Baer Relationship Manager. "
            "Use only the facts given; do not invent figures. Do not give investment advice — "
            "propose a meeting.\n\n"
            f"Client: {c['client_name']}\n"
            f"Subject matter:\n"
            + "\n".join(f"- {f.headline}" for f in top)
            + f"\n\nFraming guidance: {rel.get('entry_point') or 'none'}. "
            f"Avoid: {rel.get('avoid') or 'nothing'}."
        ),
        DRAFT_SCHEMA,
        inputs={"client": client_id, "findings": [f.id for f in top]},
        fallback=fallback,
    )
