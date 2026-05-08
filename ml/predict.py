"""
Prediction and recommendation engine built on PeakTimeModel.

All public functions accept raw submission records, train a model on-the-fly,
and return structured dicts safe to serialise as JSON.

Public API:
  run_full_analysis(records)           → complete analysis dict
  predict_cell(records, day, hour)     → single-cell probability
  recommend(records)                   → top-3 slots + best next
  explain(records, day, hour)          → SHAP factors for one cell
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from data_preprocessing import DOW_NAMES, build_activity_frame, compute_behavioral
from feature_engineering import FEATURE_NAMES, add_context, add_cyclical
from model import PeakTimeModel
from train import train_from_records

_HFMT = {h: f"{h:02d}:00" for h in range(24)}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _build_features(records: List[Dict]) -> Tuple[pd.DataFrame, Dict, np.ndarray]:
    """Return (activity_df, behavioral_dict, feature_matrix_X)."""
    df = build_activity_frame(records)
    behavioral = compute_behavioral(records)
    fe = add_cyclical(df)
    fe = add_context(fe, behavioral)
    X = fe[FEATURE_NAMES].values.astype(np.float32)
    return df, behavioral, X


def _slot(row: Any) -> Dict:
    return {
        "day":        DOW_NAMES[int(row.day_of_week)],
        "hour":       int(row.hour_of_day),
        "hour_label": _HFMT[int(row.hour_of_day)],
        "confidence": round(float(row.prob) * 100, 1),
    }


# ── Public API ────────────────────────────────────────────────────────────────

def run_full_analysis(records: List[Dict[str, Any]]) -> Dict:
    """Train model on user's records and return the complete analysis."""
    if not records:
        return _empty()

    model = train_from_records(records)
    df, behavioral, X = _build_features(records)

    proba = model.predict_proba_grid(X)
    pred  = df[["day_of_week", "hour_of_day"]].copy()
    pred["prob"] = proba

    dow_p  = pred.groupby("day_of_week")["prob"].mean()
    hour_p = pred.groupby("hour_of_day")["prob"].mean()

    top_days  = list(dow_p.nlargest(2).index)
    top_hours = list(hour_p.nlargest(3).index)

    avg_p  = float(dow_p.mean())
    peak_p = float(dow_p.max()) if len(dow_p) else 0.0
    conf   = min(95, max(30, int((peak_p / max(avg_p, 0.01) - 1) * 80 + 55)))

    wd_p = float(dow_p.iloc[:5].mean()) if len(dow_p) >= 5 else 0.0
    we_p = float(dow_p.iloc[5:].mean()) if len(dow_p) > 5  else 0.0
    schedule = (
        "Weekday-focused" if wd_p > we_p * 2.5 else
        "Weekend Warrior"  if we_p > wd_p * 1.5 else
        "Balanced schedule"
    )

    dow_chart = [
        {"day": DOW_NAMES[i], "prob": round(float(dow_p.get(i, 0.0)), 3), "isPeak": i in top_days}
        for i in range(7)
    ]
    hour_chart = [
        {"hour": h, "label": _HFMT[h], "prob": round(float(hour_p.get(h, 0.0)), 3), "isPeak": h in top_hours}
        for h in range(24)
    ]

    cluster = PeakTimeModel.classify_behavior(
        pred.sort_values(["day_of_week", "hour_of_day"])["prob"].values
    )

    top3_rows = pred.nlargest(3, "prob")
    top3      = [_slot(r) for r in top3_rows.itertuples()]
    best_next: Optional[Dict] = top3[0] if top3 else None

    # SHAP for the highest-probability cell
    peak_idx = int(pred["prob"].idxmax()) if len(pred) else 0
    factors  = model.explain_cell(X[peak_idx])

    # Full 7×24 probability grid (compact: d=day_of_week, h=hour_of_day, p=probability)
    grid_data = [
        {"d": int(r.day_of_week), "h": int(r.hour_of_day), "p": round(float(r.prob), 3)}
        for r in pred.sort_values(["day_of_week", "hour_of_day"]).itertuples()
    ]

    momentum          = compute_momentum(records)
    consistency       = compute_consistency(records)
    next_week         = forecast_next_week(dow_chart)
    streak_survival   = compute_streak_survival(records, dow_chart)
    contest_readiness = compute_contest_readiness(records, consistency, momentum)

    return {
        "peak_days":          [DOW_NAMES[d] for d in top_days],
        "peak_hours":         top_hours,
        "confidence":         conf,
        "schedule":           schedule,
        "behavior_cluster":   cluster,
        "dow_chart_data":     dow_chart,
        "hour_chart_data":    hour_chart,
        "grid_data":          grid_data,
        "recommendation":     {"best_next": best_next, "top_3": top3},
        "explanation":        {"factors": factors},
        "momentum":           momentum,
        "consistency":        consistency,
        "next_week_forecast": next_week,
        "streak_survival":    streak_survival,
        "contest_readiness":  contest_readiness,
        "model_version":      "1.2.0",
    }


def predict_cell(records: List[Dict[str, Any]], day: int, hour: int) -> Dict:
    """P(active) for a single (day, hour) cell."""
    model = train_from_records(records)
    _, _, X = _build_features(records)
    proba = model.predict_proba_grid(X)
    prob  = float(proba[day * 24 + hour])
    return {
        "day":         DOW_NAMES[day],
        "hour":        hour,
        "hour_label":  _HFMT[hour],
        "probability": round(prob, 4),
        "confidence":  round(prob * 100, 1),
    }


def recommend(records: List[Dict[str, Any]]) -> Dict:
    """Return best next session and top-3 recommended slots."""
    r = run_full_analysis(records)
    return {
        "recommendation":   r["recommendation"],
        "behavior_cluster": r["behavior_cluster"],
    }


def explain(records: List[Dict[str, Any]], day: int, hour: int) -> Dict:
    """SHAP explanation for a specific (day, hour) cell."""
    model = train_from_records(records)
    _, _, X = _build_features(records)
    model.predict_proba_grid(X)          # populate internal state
    factors = model.explain_cell(X[day * 24 + hour])
    return {"day": DOW_NAMES[day], "hour": hour, "hour_label": _HFMT[hour], "factors": factors}


# ── New ML features ───────────────────────────────────────────────────────────

def compute_momentum(records: List[Dict[str, Any]]) -> Dict:
    """Compare last-14-day activity count vs the prior 14 days."""
    active: Dict = {}
    for rec in records:
        if "timestamp" in rec:
            d = pd.to_datetime(rec["timestamp"]).date()
            active[d] = active.get(d, 0) + max(0, int(rec.get("count", 1)))
        elif "date" in rec:
            d = pd.to_datetime(rec["date"]).date()
            active[d] = active.get(d, 0) + max(0, int(rec.get("count", 0)))

    today = datetime.utcnow().date()
    recent = sum(1 for d in active if 0 <= (today - d).days < 14)
    older  = sum(1 for d in active if 14 <= (today - d).days < 28)

    if recent == 0 and older == 0:
        return {"trend": "stable", "change_pct": 0, "recent_active_days": 0,
                "older_active_days": 0, "label": "No recent activity"}

    if older == 0:
        change_pct, trend = 100, "up"
    else:
        change_pct = round((recent - older) / older * 100)
        trend = "up" if change_pct >= 20 else ("down" if change_pct <= -20 else "stable")

    label = {
        "up":     f"Up {abs(change_pct)}% vs prior 2 weeks",
        "down":   f"Down {abs(change_pct)}% vs prior 2 weeks",
        "stable": "Steady pace vs prior 2 weeks",
    }[trend]

    return {
        "trend":              trend,
        "change_pct":         change_pct,
        "recent_active_days": recent,
        "older_active_days":  older,
        "label":              label,
    }


def compute_consistency(records: List[Dict[str, Any]]) -> Dict:
    """Score how regular the user's weekly coding schedule is (0–100)."""
    weeks: Dict = defaultdict(int)
    for rec in records:
        if "timestamp" in rec:
            d = pd.to_datetime(rec["timestamp"]).date()
            weeks[d.isocalendar()[:2]] += 1
        elif "date" in rec and int(rec.get("count", 0)) > 0:
            d = pd.to_datetime(rec["date"]).date()
            weeks[d.isocalendar()[:2]] += 1

    if len(weeks) < 3:
        return {"score": 0, "label": "Not enough history", "weekly_avg": 0.0}

    counts = np.array(list(weeks.values()), dtype=float)
    mean = float(np.mean(counts))
    std  = float(np.std(counts))
    cv   = std / mean if mean > 0 else 1.0
    score = max(0, min(100, int(round((1 - min(cv, 1.0)) * 100))))

    label = (
        "Rock solid"           if score >= 80 else
        "Highly consistent"    if score >= 60 else
        "Moderately consistent" if score >= 40 else
        "Somewhat irregular"   if score >= 20 else
        "Highly irregular"
    )
    return {"score": score, "label": label, "weekly_avg": round(mean, 1)}


def forecast_next_week(dow_chart: List[Dict]) -> List[Dict]:
    """Predict activity probability for each of the next 7 calendar days."""
    today     = datetime.utcnow().date()
    dow_probs = {item["day"]: item["prob"] for item in dow_chart}

    return [
        {
            "date":       (today + timedelta(days=i)).isoformat(),
            "day":        DOW_NAMES[(today + timedelta(days=i)).weekday()],
            "day_short":  DOW_NAMES[(today + timedelta(days=i)).weekday()][:3],
            "prob":       round(float(dow_probs.get(DOW_NAMES[(today + timedelta(days=i)).weekday()], 0.0)), 3),
            "confidence": round(float(dow_probs.get(DOW_NAMES[(today + timedelta(days=i)).weekday()], 0.0)) * 100, 1),
        }
        for i in range(1, 8)
    ]


def compute_streak_survival(records: List[Dict[str, Any]], dow_chart: List[Dict]) -> Dict:
    """
    For each of the next 7 days predict whether the current streak survives.
    Cumulative survival = product of daily activity probabilities.
    """
    behavioral    = compute_behavioral(records)
    current_streak = behavioral.get("streak_length", 0)
    forecast      = forecast_next_week(dow_chart)

    cumulative = 1.0
    daily_survival = []
    for f in forecast:
        p = max(f["prob"], 0.01)          # avoid total collapse to 0 on zero-history days
        cumulative = round(cumulative * p, 4)
        daily_survival.append({
            "date":             f["date"],
            "day":              f["day"],
            "day_short":        f["day_short"],
            "daily_prob":       f["prob"],
            "cumulative_prob":  cumulative,
        })

    weakest = min(forecast, key=lambda x: x["prob"])
    survival_3d = round(daily_survival[2]["cumulative_prob"] * 100, 1) if len(daily_survival) >= 3 else 0.0
    survival_7d = round(cumulative * 100, 1)

    # Risk label
    if survival_7d >= 70:
        risk_label = "Low risk"
    elif survival_7d >= 40:
        risk_label = "Moderate risk"
    else:
        risk_label = "High risk"

    return {
        "current_streak":  current_streak,
        "survival_7d":     survival_7d,
        "survival_3d":     survival_3d,
        "risk_label":      risk_label,
        "weakest_day":     {
            "day":   weakest["day"],
            "date":  weakest["date"],
            "prob":  weakest["prob"],
        },
        "daily_survival":  daily_survival,
    }


def compute_contest_readiness(
    records:     List[Dict[str, Any]],
    consistency: Dict,
    momentum:    Dict,
) -> Dict:
    """
    0–100 contest readiness score based purely on activity patterns.
    Breakdown across 5 components so the UI can show a bar per factor.
    """
    behavioral  = compute_behavioral(records)
    today       = datetime.utcnow().date()

    # Build day totals from records
    day_totals: Dict = {}
    for rec in records:
        if "timestamp" in rec:
            d = pd.to_datetime(rec["timestamp"]).date()
        elif "date" in rec:
            d = pd.to_datetime(rec["date"]).date()
        else:
            continue
        day_totals[d] = day_totals.get(d, 0) + max(0, int(rec.get("count", 1)))

    # ① Recent activity — 30 pts
    active_30 = sum(1 for d, c in day_totals.items() if c > 0 and (today - d).days < 30)
    activity_score = round((active_30 / 30) * 30)

    # ② Schedule consistency — 25 pts
    consistency_score = round((consistency.get("score", 0) / 100) * 25)

    # ③ Momentum — 20 pts
    trend  = momentum.get("trend", "stable")
    recent = momentum.get("recent_active_days", 0)
    momentum_score = (
        20 if trend == "up" else
        12 if trend == "stable" and recent >= 7 else
        8  if trend == "stable" else
        4  if trend == "down" and recent >= 5 else
        0
    )

    # ④ Current streak — 15 pts (2 pts/day, cap at 15)
    streak       = behavioral.get("streak_length", 0)
    streak_score = min(15, streak * 2)

    # ⑤ Recency (days since last activity) — 10 pts
    days_since = behavioral.get("days_since_last", 365)
    recency_score = (
        10 if days_since == 0 else
        8  if days_since <= 1 else
        5  if days_since <= 3 else
        2  if days_since <= 7 else
        0
    )

    total = max(0, min(100, activity_score + consistency_score + momentum_score + streak_score + recency_score))

    label = (
        "Peak Form"      if total >= 85 else
        "Contest Ready"  if total >= 70 else
        "Getting There"  if total >= 50 else
        "Needs Warmup"   if total >= 30 else
        "Not Ready"
    )

    recommendation = {
        "Peak Form":     "You're in peak form — register for the next contest.",
        "Contest Ready": "Good shape. Solve 2–3 hard problems to sharpen focus.",
        "Getting There": "Increase daily coding over the next week to peak.",
        "Needs Warmup":  "Code every day for 5 days to rebuild momentum.",
        "Not Ready":     "Start with easy problems daily to re-establish rhythm.",
    }[label]

    return {
        "score":          total,
        "label":          label,
        "recommendation": recommendation,
        "components": {
            "activity":    {"score": activity_score,    "max": 30, "label": f"{active_30}/30 active days"},
            "consistency": {"score": consistency_score, "max": 25, "label": consistency.get("label", "")},
            "momentum":    {"score": momentum_score,    "max": 20, "label": momentum.get("label", "")},
            "streak":      {"score": streak_score,      "max": 15, "label": f"{streak}-day streak"},
            "recency":     {"score": recency_score,     "max": 10, "label": f"Last active {days_since}d ago"},
        },
    }


# ── Empty result when no data ─────────────────────────────────────────────────

def _empty() -> Dict:
    return {
        "peak_days":          [],
        "peak_hours":         [],
        "confidence":         0,
        "schedule":           "Insufficient data",
        "behavior_cluster":   "Unknown",
        "dow_chart_data":     [{"day": d, "prob": 0.0, "isPeak": False} for d in DOW_NAMES],
        "hour_chart_data":    [{"hour": h, "label": _HFMT[h], "prob": 0.0, "isPeak": False} for h in range(24)],
        "recommendation":     {"best_next": None, "top_3": []},
        "explanation":        {"factors": []},
        "momentum":           {"trend": "stable", "change_pct": 0, "recent_active_days": 0,
                               "older_active_days": 0, "label": "No recent activity"},
        "consistency":        {"score": 0, "label": "Not enough history", "weekly_avg": 0.0},
        "next_week_forecast": [],
        "streak_survival":    {"current_streak": 0, "survival_7d": 0.0, "survival_3d": 0.0,
                               "risk_label": "High risk", "weakest_day": None, "daily_survival": []},
        "contest_readiness":  {"score": 0, "label": "Not Ready", "recommendation": "Start coding daily to build a baseline.",
                               "components": {}},
        "model_version":      "1.2.0",
    }
