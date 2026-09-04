"""Suitability — is it a breach, or is it authorised?

Three rules the dataset punishes you for ignoring:

  * Custody accounts are not managed by the bank and are not measured against
    a mandate (DATA_DICTIONARY.md). Including them inflates the breach count.
  * The single-position limit applies where `concentration_limit_applies = Y`,
    not to diversified funds, sovereign bonds or deposits.
  * A deviation the client instructed in writing is not a breach. The waiver
    lives in the RM notes, so notes must be read before anything is flagged.
"""

from __future__ import annotations

import re

from config import TODAY
from loader import (
    CLIENT_BY_ID,
    MANDATE_BANDS,
    MANDATE_MAX_SINGLE,
    MANDATE_NOTES,
    instrument,
    managed_holdings,
    notes_for,
)
from schemas import Evidence, Finding, Metric

WAIVER_RE = re.compile(r"waiver on file|confirmed the instruction in writing", re.I)


def waivers(client_id: str) -> list[dict]:
    return [n for n in notes_for(client_id) if WAIVER_RE.search(str(n["note"]))]


def _band_breaches(client_id: str) -> list[dict]:
    h = managed_holdings(client_id)
    if not len(h):
        return []
    out = []
    for pid, grp in h.groupby("portfolio_id"):
        code = str(grp.iloc[0]["mandate_code"])
        bands = MANDATE_BANDS.get(code, {})
        total = float(grp["market_value_base"].sum()) or 1.0
        for asset_class, sub in grp.groupby("asset_class"):
            band = bands.get(asset_class)
            if not band:
                continue
            pct = float(sub["market_value_base"].sum()) / total * 100
            if pct > band["max"] or pct < band["min"]:
                out.append(
                    {
                        "portfolio_id": pid,
                        "mandate_code": code,
                        "service_model": grp.iloc[0]["service_model"],
                        "asset_class": asset_class,
                        "pct": pct,
                        "min": band["min"],
                        "max": band["max"],
                        "over": pct > band["max"],
                    }
                )
    return out


def _exclusion_breaches(client_id: str) -> list[dict]:
    """Instruments flagged sustainability_excluded held inside a mandate whose
    notes declare binding exclusions."""
    h = managed_holdings(client_id)
    out = []
    for _, r in h.iterrows():
        code = str(r["mandate_code"])
        if "exclusion" not in MANDATE_NOTES.get(code, "").lower():
            continue
        if instrument(r["instrument_id"]).get("sustainability_excluded") == "Y":
            out.append(
                {
                    "name": r["instrument_name"],
                    "pct": float(r["weight_pct"]),
                    "usd": float(r["market_value_usd"]),
                    "service_model": r["service_model"],
                    "mandate_code": code,
                }
            )
    return out


def detect(client_id: str) -> list[Finding]:
    out: list[Finding] = []
    client = CLIENT_BY_ID[client_id]
    wv = waivers(client_id)
    breaches = _band_breaches(client_id)

    # ------------------------------------------------- binding exclusions
    excl = _exclusion_breaches(client_id)
    if excl:
        code = excl[0]["mandate_code"]
        discretionary = any(e["service_model"] == "Discretionary" for e in excl)
        out.append(
            Finding(
                id=f"SUIT-EXCL-{client_id}",
                client_id=client_id,
                agent="suitability",
                tense="now",
                severity="critical",
                title="Excluded holdings inside a mandate with binding exclusions",
                headline=(
                    f"{len(excl)} instrument(s) breach the mandate's binding exclusions"
                    + (" — and this is a discretionary portfolio." if discretionary else ".")
                ),
                body=(
                    f"Mandate note: {MANDATE_NOTES.get(code, '')} "
                    + " ".join(f"{e['name']} sits at {e['pct']:.2f}%." for e in excl)
                    + (
                        " Because the service model is Discretionary, the bank selected these "
                        "positions. This is a mandate breach by the bank, not client drift, and it "
                        "escalates differently."
                        if discretionary
                        else ""
                    )
                ),
                evidence=[
                    Evidence(
                        "file",
                        "instruments.csv",
                        "sustainability_excluded = Y",
                        ", ".join(e["name"] for e in excl),
                    ),
                    Evidence("file", "mandates.csv", f"{code} · mandate_notes", MANDATE_NOTES.get(code, "")[:200]),
                ],
                metrics=[Metric(e["name"][:22], f"{e['pct']:.2f}%", alert=True, sub="Excluded") for e in excl]
                + [
                    Metric(
                        "Service model",
                        str(excl[0]["service_model"]),
                        alert=discretionary,
                        sub="Bank-managed" if discretionary else "Client-directed",
                    )
                ],
                materiality=0.75,
                urgency=0.7,
            )
        )

    # ------------------------------------------------------ band breaches
    if breaches:
        worst = max(breaches, key=lambda b: abs(b["pct"] - (b["max"] if b["over"] else b["min"])))
        authorised = bool(wv) and worst["over"]
        gap = worst["pct"] - (worst["max"] if worst["over"] else worst["min"])
        ev = [
            Evidence(
                "file",
                "mandates.csv",
                f"{worst['mandate_code']} · {worst['service_model']}",
                f"{worst['asset_class']} band {worst['min']:.0f}–{worst['max']:.0f}%",
            ),
            Evidence(
                "file",
                "portfolios.csv",
                str(worst["portfolio_id"]),
                f"Service model {worst['service_model']} — custody portfolios are excluded from this check",
            ),
        ]
        if authorised:
            n = wv[0]
            ev.append(
                Evidence(
                    "note",
                    "rm_notes.json",
                    f"{n['note_id']} · {n['note_date']}",
                    str(n["note"])[:220],
                )
            )

        out.append(
            Finding(
                id=f"SUIT-BAND-{client_id}",
                client_id=client_id,
                agent="suitability",
                tense="now",
                severity="info" if authorised else ("critical" if abs(gap) > 25 else "high"),
                title=(
                    f"{worst['asset_class']} overweight — authorised"
                    if authorised
                    else f"{client['risk_profile']} profile, {worst['pct']:.1f}% {worst['asset_class'].lower()}"
                ),
                headline=(
                    f"{worst['asset_class']} at {worst['pct']:.2f}% against a "
                    f"{worst['min']:.0f}–{worst['max']:.0f}% band"
                    + (". A suitability waiver is on file." if authorised else f" — {abs(gap):.0f} points outside.")
                ),
                body=(
                    (
                        "The client acknowledged the position exceeded the ceiling and confirmed the "
                        "instruction in writing. This is a documented, client-directed deviation and "
                        "is not reported as a breach. It is shown for completeness."
                    )
                    if authorised
                    else (
                        f"Risk profile is {client['risk_profile']}, score "
                        f"{client['risk_tolerance_score']} of 10. "
                        f"{len(breaches)} band deviation(s) across the client's mandated portfolios. "
                        "Custody accounts are excluded — they carry no mandate."
                    )
                ),
                evidence=ev,
                metrics=[
                    Metric(
                        b["asset_class"],
                        f"{b['pct']:.2f}%",
                        alert=not authorised,
                        sub=f"Band {b['min']:.0f}–{b['max']:.0f}%",
                    )
                    for b in breaches[:3]
                ]
                + [Metric("Risk score", f"{client['risk_tolerance_score']} / 10", sub=str(client["risk_profile"]))],
                materiality=min(1.0, abs(gap) / 40),
                urgency=0.2 if authorised else 0.5,
            )
        )

    # ------------------------------------------- concentration vs the limit
    h = managed_holdings(client_id)
    if len(h):
        code = str(h.iloc[0]["mandate_code"])
        limit = MANDATE_MAX_SINGLE.get(code, 10.0)
        single = h[
            h["instrument_id"].map(lambda i: instrument(i).get("concentration_limit_applies") == "Y")
        ]
        total = float(h["market_value_usd"].sum()) or 1.0
        over = [
            (r["instrument_name"], float(r["market_value_usd"]) / total * 100)
            for _, r in single.iterrows()
            if float(r["market_value_usd"]) / total * 100 > limit
        ]
        if over and not wv:
            name, pct = max(over, key=lambda x: x[1])
            out.append(
                Finding(
                    id=f"SUIT-CONC-{client_id}",
                    client_id=client_id,
                    agent="suitability",
                    tense="now",
                    severity="high",
                    title="Single position above the mandate limit",
                    headline=f"{name} is {pct:.2f}% against a {limit:.0f}% single-position limit.",
                    body=(
                        f"{len(over)} single-name position(s) exceed the limit. Diversified funds, "
                        "sovereign bonds and deposits are excluded from this test, as the limit is "
                        "intended to apply only where concentration_limit_applies is Y."
                    ),
                    evidence=[
                        Evidence(
                            "file",
                            "instruments.csv",
                            "concentration_limit_applies = Y",
                            ", ".join(f"{n} {p:.1f}%" for n, p in over[:3]),
                        ),
                        Evidence("file", "mandates.csv", f"{code} · max_single_position_pct", f"{limit:.0f}%"),
                    ],
                    metrics=[Metric(n[:24], f"{p:.2f}%", alert=True, sub=f"Limit {limit:.0f}%") for n, p in over[:3]],
                    materiality=min(1.0, pct / 50),
                    urgency=0.4,
                )
            )

    return out
