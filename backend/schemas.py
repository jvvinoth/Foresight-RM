"""The finding contract. Everything the UI renders is one of these."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

AgentId = Literal["monitor", "exposure", "resilience", "opportunity", "suitability", "relationship"]
Gate = Literal["raise", "reframe", "hold", "authorised"]
Tense = Literal["now", "next", "act"]
Severity = Literal["critical", "high", "medium", "info"]


@dataclass
class Evidence:
    kind: Literal["file", "note", "event"]
    source: str
    ref: str
    detail: str


@dataclass
class Metric:
    label: str
    value: str
    alert: bool = False
    sub: str | None = None


@dataclass
class Finding:
    id: str
    client_id: str
    agent: AgentId
    tense: Tense
    severity: Severity
    title: str
    headline: str
    body: str
    evidence: list[Evidence] = field(default_factory=list)
    metrics: list[Metric] = field(default_factory=list)

    # filled by the gate
    gate: Gate = "raise"
    gate_reason: str = ""
    revisit: str | None = None

    # ranking inputs
    materiality: float = 0.0  # 0-1, share of wealth or size of the problem
    urgency: float = 0.0  # 0-1, how soon it bites

    def to_dict(self) -> dict:
        d = asdict(self)
        d["clientId"] = d.pop("client_id")
        d["gateReason"] = d.pop("gate_reason")
        return d


SEVERITY_WEIGHT = {"critical": 1.0, "high": 0.72, "medium": 0.45, "info": 0.15}
