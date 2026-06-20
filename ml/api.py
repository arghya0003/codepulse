"""
FastAPI peak-time ML service for CodePulse.

Endpoints:
  GET  /health                  – liveness check
  POST /predict/peak_time       – full analysis (primary endpoint used by Next.js)
  POST /predict                 – single (day, hour) probability
  POST /recommend               – top-3 session recommendations + behaviour cluster
  POST /explain                 – SHAP explanation for a specific cell

Run with:
  uvicorn api:app --host 0.0.0.0 --port 8001 --reload

Environment variables:
  ML_SERVICE_API_KEY   – shared secret; if set, all POST endpoints require
                         the header  X-API-Key: <value>
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

import predict as P
import backtest as B

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CodePulse ML – Peak Time Predictor",
    version="1.0.0",
    description="XGBoost + SHAP peak-time predictor for competitive programmers",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth ──────────────────────────────────────────────────────────────────────

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


def _verify(api_key: Optional[str] = Security(_API_KEY_HEADER)) -> None:
    expected = os.getenv("ML_SERVICE_API_KEY")
    if expected and api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── Request schemas ───────────────────────────────────────────────────────────

class Submission(BaseModel):
    date:      Optional[str] = Field(None,  example="2024-01-15")
    timestamp: Optional[str] = Field(None,  example="2024-01-15T20:30:00")
    count:     int            = Field(1, ge=0)


class PeakRequest(BaseModel):
    submissions: List[Submission]


class BacktestRequest(BaseModel):
    submissions: List[Submission]
    test_weeks: int = Field(4,  ge=1, le=12, description="Weeks to hold out per split")
    n_splits:   int = Field(3,  ge=1, le=5,  description="Number of rolling windows")
    top_k:      int = Field(10, ge=1, le=50, description="Number of peak slots predicted")


class CellRequest(BaseModel):
    day:         int = Field(..., ge=0, le=6,  description="0 = Monday … 6 = Sunday")
    hour:        int = Field(..., ge=0, le=23, description="Hour of day 0–23")
    submissions: List[Submission]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_records(subs: List[Submission]) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for s in subs:
        if s.count <= 0:
            continue
        rec: Dict[str, Any] = {"count": s.count}
        if s.timestamp:
            rec["timestamp"] = s.timestamp
        elif s.date:
            rec["date"] = s.date
        if "timestamp" in rec or "date" in rec:
            out.append(rec)
    return out


def _ok(data: Any) -> Dict:
    return {"success": True, "data": data, "timestamp": datetime.utcnow().isoformat()}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> Dict:
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/predict/peak_time")
def peak_time_analysis(req: PeakRequest, _: None = Security(_verify)) -> Dict:
    """Full analysis: peak days/hours, schedule, behaviour cluster, recommendations, SHAP."""
    records = _to_records(req.submissions)
    if not records:
        raise HTTPException(status_code=422, detail="No valid submission records provided")
    try:
        return _ok(P.run_full_analysis(records))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/predict")
def predict_single(req: CellRequest, _: None = Security(_verify)) -> Dict:
    """Probability of activity at a specific (day, hour) cell."""
    records = _to_records(req.submissions)
    if not records:
        raise HTTPException(status_code=422, detail="No valid submission records provided")
    try:
        return _ok(P.predict_cell(records, req.day, req.hour))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/recommend")
def recommend(req: PeakRequest, _: None = Security(_verify)) -> Dict:
    """Best next coding session and top-3 recommended slots."""
    records = _to_records(req.submissions)
    if not records:
        raise HTTPException(status_code=422, detail="No valid submission records provided")
    try:
        return _ok(P.recommend(records))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/explain")
def explain(req: CellRequest, _: None = Security(_verify)) -> Dict:
    """SHAP feature-importance explanation for a specific (day, hour) cell."""
    records = _to_records(req.submissions)
    if not records:
        raise HTTPException(status_code=422, detail="No valid submission records provided")
    try:
        return _ok(P.explain(records, req.day, req.hour))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/backtest")
def run_backtest(req: BacktestRequest, _: None = Security(_verify)) -> Dict:
    """
    Rolling-window backtest — returns the real accuracy of peak-time predictions.

    Splits the submission history into train/test windows, trains on past data,
    predicts the top-K slots, and checks how many were actually used in the
    held-out test period.

    Returns precision@K, recall@K, F1@K averaged across all splits.
    """
    records = _to_records(req.submissions)
    if not records:
        raise HTTPException(status_code=422, detail="No valid submission records provided")
    try:
        return _ok(B.backtest(
            records,
            test_weeks=req.test_weeks,
            n_splits=req.n_splits,
            top_k=req.top_k,
        ))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
