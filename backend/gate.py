"""The Gate — can this be said today, and how?

Every finding from every detector passes through here before it reaches the
RM. Relationship facts are the only input that can override a financial
finding; the reverse never happens. That asymmetry is the design.

A finding that cannot be raised is never dropped. It is returned as `hold`
with a reason and, where one exists, a revisit date — so the audit trail is
complete and the RM stays in control of the decision.
"""

from __future__ import annotations

from schemas import Finding

# raise      — nothing blocks it
# reframe    — say it, but not the way the detector phrased it
# hold       — do not raise yet; reason and revisit date attached
# authorised — not a breach at all; documented client instruction


def apply(finding: Finding, rel: dict) -> Finding:
    """rel is the Relationship agent's structured output for this client."""
    constraints = rel.get("constraints", [])

    # 1. already resolved by the detector as documented and authorised
    if finding.severity == "info" and "authorised" in finding.title.lower():
        finding.gate = "authorised"
        finding.gate_reason = (
            "Client instruction confirmed in writing and recorded in the RM notes. "
            "Shown for completeness, not for action."
        )
        return finding

    # 2. a hard restriction — legal or explicit client instruction
    blocking = [c for c in constraints if c.get("blocking")]
    if blocking:
        c = blocking[0]
        finding.gate = "hold"
        finding.gate_reason = c["text"]
        finding.revisit = c.get("revisit")
        return finding

    # 3. a sensitivity — the finding is right, the framing is not
    sensitivities = [c for c in constraints if c.get("sensitive")]
    if sensitivities and finding.severity in {"critical", "high"}:
        c = sensitivities[0]
        finding.gate = "reframe"
        finding.gate_reason = c["text"]
        if rel.get("entry_point"):
            finding.gate_reason += f" Enter through {rel['entry_point']}."
        return finding

    # 4. nothing blocks it
    finding.gate = "raise"
    finding.gate_reason = (
        "No sensitivity or restriction on file. "
        + (
            "Time-critical."
            if finding.urgency >= 0.7
            else "Nothing blocks this conversation today."
        )
    )
    return finding


GATE_RANK_MULTIPLIER = {
    "raise": 1.0,
    "reframe": 0.85,
    "authorised": 0.15,
    "hold": 0.25,  # visible, but it should not top the radar
}


def score(finding: Finding) -> float:
    """Materiality x urgency x severity, discounted by what the gate allows."""
    from schemas import SEVERITY_WEIGHT

    base = (
        0.45 * finding.materiality
        + 0.35 * finding.urgency
        + 0.20 * SEVERITY_WEIGHT.get(finding.severity, 0.3)
    )
    return round(base * GATE_RANK_MULTIPLIER.get(finding.gate, 1.0) * 100, 1)
