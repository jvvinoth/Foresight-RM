"""Foresight RM — API.

Detectors compute. Agents narrate. No agent originates a number.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel  # noqa: E402
from typing import Optional  # noqa: E402

import engine  # noqa: E402
import store  # noqa: E402
from agents import narrator  # noqa: E402
from agents.base import cache_stats  # noqa: E402
from config import RM_ID, STATIC_DIR, TODAY  # noqa: E402
import desk as desk_module  # noqa: E402
from detectors import exposure, resilience  # noqa: E402
from integrity import TRAPS  # noqa: E402
from loader import CLIENT_BY_ID, SUMMARY  # noqa: E402

app = FastAPI(title="Foresight RM", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RM = {
    "id": RM_ID,
    "name": "Priscilla Ong",
    "desk": "Asia Desk — Singapore & Hong Kong",
    "email": "priscilla.ong@juliusbaer.com",
    "asOf": "26 August 2026",
    **SUMMARY,
}


def _client_or_404(client_id: str):
    if client_id not in CLIENT_BY_ID:
        raise HTTPException(404, f"Unknown client {client_id}")
    return CLIENT_BY_ID[client_id]


@app.get("/api/health")
def health():
    return {"ok": True, "asOf": TODAY, "cache": cache_stats(), **SUMMARY}


@app.get("/api/rm")
def rm():
    return RM


@app.get("/api/book")
def book():
    return {"rm": RM, "stats": engine.book_stats(), "clients": engine.run_book()}


@app.get("/api/clients/{client_id}")
def client(client_id: str):
    c = _client_or_404(client_id)
    res = engine.run_client(client_id)
    return {
        "id": client_id,
        "name": c["client_name"],
        "aumUsd": float(c["total_aum_usd"]),
        "wealthBand": c["wealth_band"],
        "relationship": res["relationship"],
        "score": res["score"],
        "gate": res["findings"][0].gate if res["findings"] else "hold",
    }


@app.get("/api/clients/{client_id}/findings")
def findings(client_id: str):
    _client_or_404(client_id)
    res = engine.run_client(client_id)
    return {"findings": [f.to_dict() for f in res["findings"]], "trace": res["trace"]}


@app.get("/api/clients/{client_id}/reveal")
def reveal(client_id: str):
    _client_or_404(client_id)
    return exposure.reveal(client_id)


@app.get("/api/clients/{client_id}/holdings")
def client_holdings_api(client_id: str):
    import loader
    _client_or_404(client_id)
    df = loader.client_holdings(client_id)
    positions = []
    for _, r in df.iterrows():
        positions.append({
            "portfolioId": str(r["portfolio_id"]),
            "portfolioName": str(r["portfolio_name"]),
            "instrumentId": str(r["instrument_id"]),
            "instrumentName": str(r["instrument_name"]),
            "assetClass": str(r["asset_class"]),
            "subAssetClass": str(r["sub_asset_class"]),
            "sector": str(r["sector"]),
            "region": str(r["region"]),
            "quantity": float(r["quantity"]),
            "currency": str(r["instrument_ccy"]),
            "priceLocal": float(r["price_local"]),
            "marketValueUsd": float(r["market_value_usd"]),
            "weightPct": float(r["weight_pct"]),
            "avgCostLocal": float(r["avg_cost_local"]) if r["avg_cost_local"] == r["avg_cost_local"] else 0.0,
            "serviceModel": str(r["service_model"]),
            "acquiredDate": str(r["acquired_date"]),
            "valuationDate": str(r["valuation_date"]),
            "currency": str(r["instrument_ccy"])
        })
    positions.sort(key=lambda x: -x["marketValueUsd"])
    return {"positions": positions}


@app.get("/api/clients/{client_id}/outlook")
def outlook(client_id: str):
    _client_or_404(client_id)
    view = resilience.facility_view(client_id)
    if view is None:
        return {"facility": None, "shocks": [], "path": []}
    return {"facility": view["facilityId"], **view}


@app.get("/api/clients/{client_id}/brief")
def brief(client_id: str):
    _client_or_404(client_id)
    res = engine.run_client(client_id)
    return narrator.brief(client_id, res["findings"], res["relationship"])


@app.get("/api/clients/{client_id}/handover")
def handover(client_id: str):
    c = _client_or_404(client_id)
    res = engine.run_client(client_id)
    rel = res["relationship"]
    open_actions = [f.title for f in res["findings"] if f.gate in {"raise", "reframe"}]
    return {
        "language": rel["language"],
        "tenureYears": rel["tenure_years"],
        "since": rel["since"],
        "sourceOfWealth": rel["source_of_wealth"],
        "lifeStage": rel["life_stage"],
        "objectives": rel["objectives"],
        "crossBorder": rel["cross_border"],
        "residence": rel["residence"],
        "taxDomicile": rel["tax_domicile"],
        "beliefs": [s["quote"] for s in rel["said"]][:2],
        "doNot": [c_["text"] for c_ in rel["constraints"]],
        "openActions": open_actions,
        "lastContactDays": rel["last_contact_days"],
        "kycDue": rel["kyc_due"],
        "kycOverdue": rel["kyc_overdue"],
        "name": c["client_name"],
    }


class DraftRequest(BaseModel):
    pass


@app.post("/api/clients/{client_id}/draft")
def draft(client_id: str, _: Optional[DraftRequest] = None):
    """The one live model call. Falls back to cache when no key is present."""
    _client_or_404(client_id)
    res = engine.run_client(client_id)
    return narrator.draft(client_id, res["findings"], res["relationship"])


class ApprovalRequest(BaseModel):
    action: str = "approve"
    ai_draft: str = ""
    final_text: str = ""
    finding_ids: list[str] = []


@app.post("/api/clients/{client_id}/approve")
def approve(client_id: str, req: ApprovalRequest):
    _client_or_404(client_id)
    return store.record(
        RM_ID, client_id, req.finding_ids, req.action, req.ai_draft, req.final_text
    )


@app.get("/api/approvals")
def approvals(client_id: Optional[str] = None):
    return {"approvals": store.history(client_id)}


@app.get("/api/agents/trace/{client_id}")
def trace(client_id: str):
    _client_or_404(client_id)
    return {"trace": engine.run_client(client_id)["trace"], "cache": cache_stats()}


@app.get("/api/desk")
def desk_roster():
    """Clients where at least one agent was overruled or excused."""
    return {"clients": desk_module.roster()}


@app.get("/api/desk/{client_id}")
def desk_client(client_id: str):
    """Six specialists on one client: who ran, what they found, where they disagree."""
    _client_or_404(client_id)
    return desk_module.desk(client_id)


@app.get("/api/integrity")
def integrity():
    return {"traps": TRAPS, "verify": "python backend/verify.py"}


@app.on_event("startup")
def warm() -> None:
    """Compute the whole book once so the first request is instant."""
    engine.run_book()


# ---------------------------------------------------------------- static UI
if (STATIC_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

if STATIC_DIR.exists():

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(404, "UI not built")
