"""Exposure — what is this client actually exposed to?

Three things a position-level report cannot show:

  1. Look-through. A structured product's asset class says what it is;
     `underlying_reference` says what you are exposed to.
  2. Aggregation. Risk that only appears across a client's portfolios.
  3. Correlation. Positions that share a sector and a region with each other,
     with the client's own source of wealth, and with their loan collateral.

Clustering is on (sector, region) rather than on name similarity, because
those are dimensions the bank already records and can defend to a client.
"""

from __future__ import annotations

import re

from config import TODAY
from loader import (
    CLIENT_BY_ID,
    MANDATE_MAX_SINGLE,
    client_holdings,
    client_total_usd,
    credit_facilities,
    instrument,
    planned_cash_needs,
)
from schemas import Evidence, Finding, Metric

# Regions that behave as one bet for concentration purposes.
REGION_FAMILY = {
    "Hong Kong": "Greater China",
    "Greater China": "Greater China",
    "Indonesia": "Southeast Asia",
    "Singapore": "Southeast Asia",
    "Southeast Asia": "Southeast Asia",
    "South Asia": "South Asia",
    "Japan": "Japan",
    "Asia": "Asia",
    "Asia Pacific": "Asia",
    "Asia ex-Japan": "Asia",
    "North America": "North America",
    "Europe": "Europe",
    "Global": "Global",
    "Emerging Markets": "Global",
}

# Sectors that are not a directional bet on anything.
NEUTRAL_SECTORS = {"Cash", "Sovereign", ""}

# Wrapper and multi-asset labels. These can join a cluster through their
# look-through underlying, but they must never seed one — "Multi" is a
# product label, not an exposure.
NON_SEED_SECTORS = NEUTRAL_SECTORS | {"Multi", "Diversified", "Macro", "Equity Long Short"}

_STOP = {"the", "and", "ltd", "inc", "plc", "corp", "tbk", "pte", "fund", "etf", "spot"}


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", str(text).lower()) if len(t) > 2 and t not in _STOP}


def resolve_underlying(instrument_id: str) -> tuple[str, str | None]:
    """Return (effective exposure, wrapper note if the exposure was hidden)."""
    inst = instrument(instrument_id)
    name = inst.get("instrument_name", instrument_id)
    ref = inst.get("underlying_reference")
    if isinstance(ref, str) and ref.strip() and ref.strip().lower() not in {"nan", "none", "-"}:
        return ref.strip(), f"{name} resolves to {ref.strip()}"
    return name, None


def _positions(client_id: str, snapshot: str = TODAY) -> list[dict]:
    total = client_total_usd(client_id, snapshot) or 1.0
    rows = []
    for _, r in client_holdings(client_id, snapshot).iterrows():
        inst = instrument(r["instrument_id"])
        eff, wrapper = resolve_underlying(r["instrument_id"])
        sector = str(inst.get("sector", "") or "")
        region = str(inst.get("region", "") or "")
        rows.append(
            {
                "name": r["instrument_name"],
                "effective": eff,
                "wrapper": wrapper,
                "usd": float(r["market_value_usd"]),
                "pct": float(r["market_value_usd"]) / total * 100,
                "sector": sector,
                "region": region,
                "family": REGION_FAMILY.get(region, region),
                "single_name": inst.get("concentration_limit_applies") == "Y",
                "portfolio_id": r["portfolio_id"],
                "service_model": r["service_model"],
                "mandate_code": r.get("mandate_code"),
                "under_tokens": _tokens(eff),
            }
        )
    return rows


def cluster(client_id: str, snapshot: str = TODAY) -> dict:
    """The client's single largest correlated bet.

    core     — same sector and region as the seed, plus anything whose
               look-through underlying names that sector or issuer.
    adjacent — same region family, different sector.
    """
    rows = _positions(client_id, snapshot)
    client = CLIENT_BY_ID[client_id]
    candidates = [r for r in rows if r["single_name"] and r["sector"] not in NON_SEED_SECTORS]
    if not candidates:
        return {"core": [], "adjacent": [], "core_pct": 0.0, "all_pct": 0.0, "label": ""}

    seed = max(candidates, key=lambda r: r["usd"])
    seed_keys = _tokens(seed["sector"]) | _tokens(seed["name"])

    core, adjacent = [], []
    for r in rows:
        if r["sector"] in NEUTRAL_SECTORS:
            continue
        same_cell = r["sector"] == seed["sector"] and r["region"] == seed["region"]
        looks_through = bool(r["wrapper"]) and bool(r["under_tokens"] & seed_keys)
        if same_cell or looks_through:
            core.append(r)
        elif r["family"] == seed["family"]:
            adjacent.append(r)

    core.sort(key=lambda r: -r["usd"])
    adjacent.sort(key=lambda r: -r["usd"])

    sow = _tokens(client.get("source_of_wealth", ""))
    core_pct = sum(r["pct"] for r in core)

    return {
        "seed": seed,
        "core": core,
        "adjacent": adjacent,
        "core_pct": core_pct,
        "all_pct": core_pct + sum(r["pct"] for r in adjacent),
        "label": f"{seed['region']} {seed['sector'].lower()}",
        "sow_overlap": bool((seed_keys | _tokens(seed["region"])) & sow),
        "wrapped": [r for r in core if r["wrapper"]],
        "portfolios": {r["portfolio_id"] for r in core},
    }


def detect(client_id: str) -> list[Finding]:
    cl = cluster(client_id)
    if not cl["core"] or cl["core_pct"] < 20:
        return []

    client = CLIENT_BY_ID[client_id]
    core_pct, all_pct = cl["core_pct"], cl["all_pct"]
    issuers = {r["name"] for r in cl["core"]}
    limit = MANDATE_MAX_SINGLE.get(str(cl["core"][0].get("mandate_code") or ""), 10.0)

    ev = [
        Evidence(
            "file",
            "holdings.csv",
            f"{len(cl['core'])} rows · {TODAY}",
            f"Aggregated across {len(cl['portfolios'])} portfolio(s), sector {cl['seed']['sector']}"
            f" / region {cl['seed']['region']}",
        )
    ]
    for w in cl["wrapped"][:1]:
        ev.append(Evidence("file", "instruments.csv", "underlying_reference", w["wrapper"]))
    if cl["sow_overlap"]:
        ev.append(
            Evidence("file", "clients.csv", "source_of_wealth", client.get("source_of_wealth", ""))
        )

    fac = credit_facilities[credit_facilities["client_id"] == client_id]
    collateral_same_bet = False
    if len(fac):
        f0 = fac.iloc[0]
        collateral_same_bet = str(f0["collateral_portfolio_id"]) in cl["portfolios"]
        if collateral_same_bet:
            ev.append(
                Evidence(
                    "file",
                    "credit_facilities.csv",
                    str(f0["facility_id"]),
                    "Facility is secured on the portfolio that carries the concentration",
                )
            )

    strands = []
    if cl["wrapped"]:
        strands.append("a structured product that resolves to the same underlying")
    if collateral_same_bet:
        strands.append("the collateral behind their loan")
    if cl["sow_overlap"]:
        strands.append("the business the wealth came from")

    body = (
        f"{len(cl['core'])} positions across {len(cl['portfolios'])} portfolio(s) sit in the same "
        f"sector and region: {cl['seed']['sector']} / {cl['seed']['region']}. Together they are "
        f"{core_pct:.1f}% of total wealth against a {limit:.0f}% mandate single-position limit. "
        f"Adding adjacent {cl['seed']['family']} exposure in other sectors takes it to {all_pct:.1f}%."
    )
    if strands:
        body += " The same bet also carries " + ", ".join(strands) + "."

    need = planned_cash_needs[planned_cash_needs["client_id"] == client_id]
    if len(need) and collateral_same_bet:
        n0 = need.iloc[0]
        body += (
            f" A {n0['currency']} {float(n0['amount']):,.0f} commitment falls due from "
            f"{n0['due_from']}, and it cannot be funded by selling the concentration without "
            "worsening the loan-to-value on what remains."
        )

    return [
        Finding(
            id=f"EXP-{client_id}",
            client_id=client_id,
            agent="exposure",
            tense="now",
            severity="critical" if core_pct >= 35 else "high",
            title=f"One bet: {cl['label']}",
            headline=(
                f"{core_pct:.1f}% of wealth sits in {cl['label']} — across "
                f"{len(issuers)} position{'s' if len(issuers) != 1 else ''} and "
                f"{len({r['sector'] for r in cl['core']})} instrument type(s)."
            ),
            body=body,
            evidence=ev,
            metrics=[
                Metric("Core exposure", f"{core_pct:.1f}%", alert=True, sub=cl["label"]),
                Metric(
                    "Incl. adjacent",
                    f"{all_pct:.1f}%",
                    alert=all_pct >= 60,
                    sub=f"All {cl['seed']['family']}",
                ),
                Metric("Mandate limit", f"{limit:.0f}%", sub="Single position"),
            ],
            materiality=min(1.0, core_pct / 50),
            urgency=0.8 if collateral_same_bet else 0.5,
        )
    ]


def reveal(client_id: str) -> dict:
    """Payload for the look-through visualisation."""
    cl = cluster(client_id)
    if not cl["core"]:
        return {"label": "", "corePct": 0, "allPct": 0, "rows": [], "outside": []}

    client = CLIENT_BY_ID[client_id]
    rows = [
        {
            "label": r["name"],
            "pct": round(r["pct"], 2),
            "usd": round(r["usd"]),
            "kind": kind,
            "wrapper": r["wrapper"],
        }
        for kind, group in (("core", cl["core"]), ("adjacent", cl["adjacent"]))
        for r in group
    ]

    outside = []
    if cl["sow_overlap"]:
        outside.append(
            {
                "label": "Their career",
                "detail": client.get("source_of_wealth", ""),
                "system": "CRM · source_of_wealth",
            }
        )
    fac = credit_facilities[credit_facilities["client_id"] == client_id]
    if len(fac):
        f0 = fac.iloc[0]
        outside.append(
            {
                "label": f"{f0['facility_ccy']} {float(f0[f'drawn_{TODAY}']) / 1e6:.0f}m facility",
                "detail": (
                    f"Secured on the same collateral. LTV {float(f0[f'ltv_pct_{TODAY}']):.2f}% "
                    f"against a {float(f0['margin_call_ltv_pct']):.2f}% trigger"
                ),
                "system": f"Credit system · {f0['facility_id']}",
            }
        )
    need = planned_cash_needs[planned_cash_needs["client_id"] == client_id]
    if len(need):
        n0 = need.sort_values("due_from").iloc[0]
        outside.append(
            {
                "label": f"{n0['currency']} {float(n0['amount']) / 1e6:.1f}m due {n0['due_from'][:7]}",
                "detail": str(n0["description"]),
                "system": f"Planning · {n0['certainty'].lower()}",
            }
        )

    return {
        "label": cl["label"],
        "corePct": round(cl["core_pct"], 1),
        "allPct": round(cl["all_pct"], 1),
        "rows": rows,
        "outside": outside,
    }
