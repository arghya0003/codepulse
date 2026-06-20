"""
Transforms raw submission records into a 168-cell (7 days × 24 hours) activity DataFrame.

Supported input formats:
  {"timestamp": "2024-01-15T20:30:00", "count": 1}   # real datetime
  {"date": "2024-01-15", "count": 5}                  # daily aggregate

Daily-aggregate records are expanded synthetically using an evening-weighted
hour distribution typical for competitive programmers. The seed is derived
from the date so identical inputs always produce identical outputs.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Any, Dict, List

# Hour-activity prior: competitive programmers trend toward evenings (18-23)
_HOUR_PRIOR = np.array([
    0.008, 0.005, 0.004, 0.003, 0.004, 0.007,   # 00-05  late night
    0.015, 0.025, 0.035, 0.040, 0.038, 0.036,   # 06-11  morning
    0.038, 0.038, 0.042, 0.042, 0.038, 0.042,   # 12-17  afternoon
    0.055, 0.072, 0.080, 0.080, 0.068, 0.040,   # 18-23  evening peak
], dtype=np.float64)
_HOUR_PRIOR /= _HOUR_PRIOR.sum()

DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

_DECAY_LAM = 0.005  # matches feature_engineering default


def _expand_record(record: Dict[str, Any]) -> List[Dict]:
    """Normalize one record into hourly event dicts."""
    now = datetime.utcnow()

    if "timestamp" in record:
        dt = pd.to_datetime(record["timestamp"])
        days_old = max(0, (now.date() - dt.date()).days)
        return [{"dow": dt.dayofweek, "hour": dt.hour, "days_old": days_old, "syn": False}]

    if "date" in record:
        count = max(0, int(record.get("count", 1)))
        if count == 0:
            return []
        dt = pd.to_datetime(record["date"])
        days_old = max(0, (now.date() - dt.date()).days)
        # Deterministic seed from date so same input → same synthetic hours
        seed = int(dt.timestamp()) % (2**31)
        rng = np.random.default_rng(seed)
        hours = rng.choice(24, size=count, p=_HOUR_PRIOR)
        return [{"dow": dt.dayofweek, "hour": int(h), "days_old": days_old, "syn": True}
                for h in hours]

    return []


def _hits_within(s: pd.Series, days: int) -> int:
    return int((s <= days).sum())


def _cell_recency(s: pd.Series) -> float:
    return float(np.exp(-_DECAY_LAM * s).sum())


def build_activity_frame(records: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Build the full 168-cell activity DataFrame.

    Returns DataFrame with columns:
        day_of_week, hour_of_day, active, days_old, synthetic,
        cell_hit_count, cell_hit_count_30d, cell_hit_count_90d,
        cell_days_since_active, cell_recency_score
    Index is reset 0-167, ordered by (day_of_week, hour_of_day).
    """
    grid = pd.DataFrame(
        [(d, h) for d in range(7) for h in range(24)],
        columns=["day_of_week", "hour_of_day"],
    )

    events = [ev for rec in records for ev in _expand_record(rec)]

    if not events:
        grid["active"] = 0
        grid["days_old"] = 365
        grid["synthetic"] = True
        grid["cell_hit_count"] = 0
        grid["cell_hit_count_30d"] = 0
        grid["cell_hit_count_90d"] = 0
        grid["cell_days_since_active"] = 365
        grid["cell_recency_score"] = 0.0
        return grid.reset_index(drop=True)

    raw = pd.DataFrame({
        "day_of_week": [e["dow"]      for e in events],
        "hour_of_day": [e["hour"]     for e in events],
        "days_old":    [e["days_old"] for e in events],
        "synthetic":   [e["syn"]      for e in events],
    })

    agg = (
        raw.groupby(["day_of_week", "hour_of_day"])
           .agg(
               cell_hit_count=("days_old", "count"),
               days_old=("days_old", "min"),
               synthetic=("synthetic", "all"),
               cell_hit_count_30d=("days_old", lambda x: _hits_within(x, 30)),
               cell_hit_count_90d=("days_old", lambda x: _hits_within(x, 90)),
               cell_recency_score=("days_old", _cell_recency),
           )
           .reset_index()
    )
    agg["active"] = (agg["cell_hit_count"] > 0).astype(int)
    # days since last event in this cell = min(days_old) already computed above
    agg["cell_days_since_active"] = agg["days_old"]

    merged = grid.merge(agg, on=["day_of_week", "hour_of_day"], how="left")
    merged["active"]               = merged["active"].fillna(0).astype(int)
    merged["days_old"]             = merged["days_old"].fillna(365).astype(int)
    merged["synthetic"]            = merged["synthetic"].fillna(True).astype(bool)
    merged["cell_hit_count"]       = merged["cell_hit_count"].fillna(0).astype(int)
    merged["cell_hit_count_30d"]   = merged["cell_hit_count_30d"].fillna(0).astype(int)
    merged["cell_hit_count_90d"]   = merged["cell_hit_count_90d"].fillna(0).astype(int)
    merged["cell_days_since_active"] = merged["cell_days_since_active"].fillna(365).astype(int)
    merged["cell_recency_score"]   = merged["cell_recency_score"].fillna(0.0)
    return merged.reset_index(drop=True)


def compute_behavioral(records: List[Dict[str, Any]]) -> Dict[str, int]:
    """Compute streak_length, prev_day_active, days_since_last."""
    active: set = set()
    for rec in records:
        if "timestamp" in rec:
            active.add(pd.to_datetime(rec["timestamp"]).date())
        elif "date" in rec and int(rec.get("count", 0)) > 0:
            active.add(pd.to_datetime(rec["date"]).date())

    if not active:
        return {"streak_length": 0, "prev_day_active": 0, "days_since_last": 365}

    today = datetime.utcnow().date()
    last = max(active)
    days_since = (today - last).days
    prev_active = 1 if (today - timedelta(days=1)) in active else 0

    streak, cursor = 0, last
    while cursor in active:
        streak += 1
        cursor -= timedelta(days=1)

    return {"streak_length": streak, "prev_day_active": prev_active, "days_since_last": days_since}
