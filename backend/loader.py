"""Loads the twelve challenge files into memory once, at import.

1,015 holdings rows across five snapshots. A database buys nothing here.

Two conventions from DATA_DICTIONARY.md are applied at load time so that no
downstream code has to remember them:

  * FX is quoted in market convention. USDSGD is SGD per USD; EURUSD is USD
    per EUR. `to_usd` handles both directions.
  * Bond quantity is expressed in units of 100 nominal, so market value is
    quantity x price. That already holds for every asset class, so the
    supplied market_value_* columns are used directly rather than recomputed.
"""

from __future__ import annotations

import json
from functools import lru_cache

import pandas as pd

from config import DATA_DIR, SNAPSHOTS, TODAY


def _csv(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / f"{name}.csv")


clients = _csv("clients")
portfolios = _csv("portfolios")
holdings = _csv("holdings")
instruments = _csv("instruments")
mandates = _csv("mandates")
transactions = _csv("transactions")
credit_facilities = _csv("credit_facilities")
commitments = _csv("commitments")
planned_cash_needs = _csv("planned_cash_needs")
market_context = _csv("market_context")
event_log = _csv("event_log")

with open(DATA_DIR / "rm_notes.json") as fh:
    rm_notes: list[dict] = json.load(fh)

# ---------------------------------------------------------------- indexes

CLIENT_BY_ID = clients.set_index("client_id").to_dict("index")
PORTFOLIO_BY_ID = portfolios.set_index("portfolio_id").to_dict("index")
INSTRUMENT_BY_ID = instruments.set_index("instrument_id").to_dict("index")

# mandate_code -> asset_class -> {min,target,max}
MANDATE_BANDS: dict[str, dict[str, dict]] = {}
MANDATE_NOTES: dict[str, str] = {}
MANDATE_MAX_SINGLE: dict[str, float] = {}
for _, row in mandates.iterrows():
    MANDATE_BANDS.setdefault(row["mandate_code"], {})[row["asset_class"]] = {
        "min": float(row["min_pct"]),
        "target": float(row["target_pct"]),
        "max": float(row["max_pct"]),
    }
    MANDATE_NOTES[row["mandate_code"]] = row.get("mandate_notes", "") or ""
    MANDATE_MAX_SINGLE[row["mandate_code"]] = float(row["max_single_position_pct"])

NOTES_BY_CLIENT: dict[str, list[dict]] = {}
for _n in rm_notes:
    NOTES_BY_CLIENT.setdefault(_n["client_id"], []).append(_n)
for _v in NOTES_BY_CLIENT.values():
    _v.sort(key=lambda n: n["note_date"])


# ------------------------------------------------------------------- fx

_FX = {
    (r["series_id"], r["snapshot_date"]): float(r["value"])
    for _, r in market_context.iterrows()
    if r["category"] == "FX"
}


def to_usd(amount: float, currency: str, snapshot: str = TODAY) -> float:
    """Convert a local-currency amount to USD, respecting quote convention."""
    if currency == "USD":
        return float(amount)
    # e.g. USDSGD = SGD per USD -> divide
    direct = _FX.get((f"USD{currency}", snapshot))
    if direct:
        return float(amount) / direct
    # e.g. EURUSD = USD per EUR -> multiply
    inverse = _FX.get((f"{currency}USD", snapshot))
    if inverse:
        return float(amount) * inverse
    return float(amount)


def series(series_id: str, snapshot: str = TODAY) -> float | None:
    hit = market_context[
        (market_context["series_id"] == series_id)
        & (market_context["snapshot_date"] == snapshot)
    ]
    return float(hit.iloc[0]["value"]) if len(hit) else None


# -------------------------------------------------------------- helpers


@lru_cache(maxsize=None)
def snapshot_holdings(snapshot: str = TODAY) -> pd.DataFrame:
    """Holdings at one snapshot, joined to portfolio service model + mandate."""
    h = holdings[holdings["snapshot_date"] == snapshot].copy()
    p = portfolios[["portfolio_id", "service_model", "mandate_code", "portfolio_name"]]
    return h.merge(p, on="portfolio_id", how="left")


def client_holdings(client_id: str, snapshot: str = TODAY) -> pd.DataFrame:
    h = snapshot_holdings(snapshot)
    return h[h["client_id"] == client_id]


def managed_holdings(client_id: str, snapshot: str = TODAY) -> pd.DataFrame:
    """Holdings inside a mandate. Custody is excluded — it carries no mandate."""
    from config import MANDATED_SERVICE_MODELS

    h = client_holdings(client_id, snapshot)
    return h[h["service_model"].isin(MANDATED_SERVICE_MODELS)]


def client_total_usd(client_id: str, snapshot: str = TODAY) -> float:
    """Total wealth including custody — custody is not managed, but it is theirs."""
    return float(client_holdings(client_id, snapshot)["market_value_usd"].sum())


def instrument(instrument_id: str) -> dict:
    return INSTRUMENT_BY_ID.get(instrument_id, {})


def notes_for(client_id: str) -> list[dict]:
    return NOTES_BY_CLIENT.get(client_id, [])


def events_between(start: str, end: str) -> pd.DataFrame:
    return event_log[(event_log["event_date"] >= start) & (event_log["event_date"] <= end)]


SUMMARY = {
    "clients": len(clients),
    "portfolios": len(portfolios),
    "positions": len(holdings[holdings["snapshot_date"] == TODAY]),
    "notes": len(rm_notes),
    "events": len(event_log),
    "snapshots": SNAPSHOTS,
    "as_of": TODAY,
}
