#!/usr/bin/env python3
"""Prints every headline claim with the rows it came from.

    python backend/verify.py

Written so that a reviewer can check the numbers against the supplied dataset
in a few seconds, without reading the detectors.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import SNAPSHOTS, TODAY  # noqa: E402
from detectors import exposure, resilience, suitability  # noqa: E402
from loader import (  # noqa: E402
    CLIENT_BY_ID,
    client_holdings,
    client_total_usd,
    credit_facilities,
    instrument,
    managed_holdings,
    notes_for,
    portfolios,
    series,
    transactions,
)

W = 78


def rule(title: str) -> None:
    print(f"\n{'=' * W}\n{title}\n{'=' * W}")


def claim(text: str) -> None:
    print(f"\n  CLAIM  {text}")


def src(text: str) -> None:
    print(f"  source {text}")


def main() -> None:
    print(f"Foresight RM — claim verification.  Snapshot {TODAY}.")

    # ------------------------------------------------------------------ 1
    rule("1. Lau Chi Ming — one bet: Hong Kong real estate")
    cl = exposure.cluster("CL-0014")
    claim(f"Core exposure {cl['core_pct']:.2f}% · including adjacent {cl['all_pct']:.2f}%")
    src(f"holdings.csv @ {TODAY}, sector={cl['seed']['sector']} region={cl['seed']['region']}")
    for r in cl["core"]:
        print(f"         {r['pct']:6.2f}%  USD {r['usd']:>12,.0f}  {r['name']}")
        if r["wrapper"]:
            print(f"                 look-through: {r['wrapper']}")
    print("         ------")
    for r in cl["adjacent"]:
        print(f"  adj    {r['pct']:6.2f}%  USD {r['usd']:>12,.0f}  {r['name']}")

    fac = credit_facilities[credit_facilities["client_id"] == "CL-0014"].iloc[0]
    claim(
        f"LTV {float(fac[f'ltv_pct_{TODAY}']):.2f}% against a "
        f"{float(fac['margin_call_ltv_pct']):.2f}% trigger"
    )
    src(f"credit_facilities.csv {fac['facility_id']}")
    for s in resilience.shocks(fac):
        flag = "  *** MARGIN CALL ***" if s["breach"] else ""
        print(f"         collateral {s['shock']:>6}  LTV {s['ltv']:6.2f}%{flag}")

    # ------------------------------------------------------------------ 2
    rule("2. Hartono Wijaya Kusuma — a breach cured by an event, not an action")
    f5 = credit_facilities[credit_facilities["client_id"] == "CL-0001"].iloc[0]
    trigger = float(f5["margin_call_ltv_pct"])
    claim(f"Breached {trigger:.0f}% trigger while the drawn amount never changed")
    src(f"credit_facilities.csv {f5['facility_id']} across 5 snapshots")
    for p in resilience.ltv_path(f5):
        flag = "  *** BREACH ***" if p["breach"] else ""
        print(
            f"         {p['date']}  LTV {p['ltv']:6.2f}%  drawn {p['drawn']:>12,.0f}"
            f"  collateral {p['collateral']:>13,.0f}{flag}"
        )
    hcl = exposure.cluster("CL-0001")
    claim(f"Indonesia energy exposure {hcl['core_pct']:.2f}% including look-through")
    for r in hcl["core"]:
        print(f"         {r['pct']:6.2f}%  {r['name']}")
        if r["wrapper"]:
            print(f"                 look-through: {r['wrapper']}")

    # ------------------------------------------------------------------ 3
    rule("3. Aishah binti Rahman — excluded holdings in a discretionary mandate")
    excl = suitability._exclusion_breaches("CL-0005")
    claim(f"{len(excl)} instrument(s) flagged sustainability_excluded=Y inside a binding mandate")
    for e in excl:
        src(f"{e['name']} — {e['pct']:.2f}% · service model {e['service_model']}")

    # ------------------------------------------------------------------ 4
    rule("4. Alistair Pemberton-Hale — the breach that is not a breach")
    wv = suitability.waivers("CL-0007")
    claim(f"{len(wv)} suitability waiver(s) on file — commodity overweight is authorised")
    for n in wv:
        src(f"rm_notes.json {n['note_id']} · {n['note_date']}")
        print(f"         \"{str(n['note'])[:150]}\"")

    # ------------------------------------------------------------------ 5
    rule("5. Andreas Lindqvist — the cost of not deciding")
    h = managed_holdings("CL-0009")
    cash = float(h[h["asset_class"] == "Cash and Equivalents"]["market_value_usd"].sum())
    total = float(h["market_value_usd"].sum())
    a, b = series("SPX", SNAPSHOTS[0]), series("SPX", TODAY)
    claim(f"Cash USD {cash:,.0f} = {cash / total * 100:.1f}% of the mandated portfolio")
    src(f"market_context.csv SPX {a:,.0f} -> {b:,.0f} = {(b / a - 1) * 100:+.1f}%")
    for n in notes_for("CL-0009"):
        print(f"         rm_notes {n['note_id']}: \"{str(n['note'])[:140]}\"")

    # ------------------------------------------------------------------ 6
    rule("6. Traps handled")
    custody = portfolios[portfolios["service_model"] == "Custody"]
    claim(f"{len(custody)} custody portfolio(s) excluded from mandate tests")
    for _, p in custody.iterrows():
        src(f"{p['portfolio_id']} · {p['portfolio_name']} · {CLIENT_BY_ID[p['client_id']]['client_name']}")

    ravi = client_holdings("CL-0002")
    stale = ravi[ravi["valuation_date"] != TODAY]
    for _, r in stale.iterrows():
        pct = float(r["market_value_usd"]) / client_total_usd("CL-0002") * 100
        claim(f"Stale mark: {r['instrument_name']} at {pct:.2f}% of wealth")
        src(f"valuation_date {r['valuation_date']} vs snapshot {TODAY}")
        prices = {d: instrument(r["instrument_id"]).get(f"price_{d}") for d in SNAPSHOTS}
        src(f"prices across snapshots: {prices}")

    gated = transactions[transactions["transaction_type"] == "Redemption Request"]
    for _, t in gated.iterrows():
        claim("Gated redemption precedent")
        src(f"transactions.csv {t['trade_date']} — {t['narrative']}")

    print(f"\n{'=' * W}\nEvery figure above is read from data/ at the {TODAY} snapshot.\n")


if __name__ == "__main__":
    main()
