"""
Rolling-window backtest for PeakTimeModel.

Strategy
--------
Divide the user's history into N chronological splits. For each split:
  - Train on all data BEFORE the test window
  - Test on the next `test_weeks` weeks of actual activity
  - Predict the top-K most likely (day, hour) slots
  - Compute precision@K: fraction of predicted slots that were actually used
  - Compute recall@K:    fraction of actual active slots that were predicted

Averaging across splits gives an unbiased estimate of real-world accuracy.

Minimum data requirement: (test_weeks + 4) * 7 days total history.
"""

from datetime import date, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from data_preprocessing import build_activity_frame, compute_behavioral
from feature_engineering import (
    FEATURE_NAMES,
    add_cell_features,
    add_context,
    add_cyclical,
    add_time_blocks,
)
from train import train_from_records


# ── Helpers ───────────────────────────────────────────────────────────────────

def _record_date(rec: Dict[str, Any]) -> Optional[date]:
    if "timestamp" in rec:
        return pd.to_datetime(rec["timestamp"]).date()
    if "date" in rec:
        return pd.to_datetime(rec["date"]).date()
    return None


def _active_slots(records: List[Dict[str, Any]]) -> set:
    """Return set of (day_of_week, hour_of_day) tuples seen in records."""
    slots: set = set()
    for rec in records:
        if int(rec.get("count", 1)) <= 0:
            continue
        if "timestamp" in rec:
            dt = pd.to_datetime(rec["timestamp"])
            slots.add((int(dt.dayofweek), int(dt.hour)))
        elif "date" in rec:
            # Daily records have no hour — mark all hours for that day
            dt = pd.to_datetime(rec["date"])
            for h in range(24):
                slots.add((int(dt.dayofweek), h))
    return slots


def _top_k_slots(model, train_records: List[Dict[str, Any]], k: int) -> set:
    """Return the top-k (day_of_week, hour_of_day) cells by predicted probability."""
    df = build_activity_frame(train_records)
    behavioral = compute_behavioral(train_records)
    fe = add_cyclical(df)
    fe = add_time_blocks(fe)
    fe = add_context(fe, behavioral)
    fe = add_cell_features(fe)
    X = fe[FEATURE_NAMES].values.astype(np.float32)
    proba = model.predict_proba_grid(X)

    pred = df[["day_of_week", "hour_of_day"]].copy()
    pred["prob"] = proba
    top = pred.nlargest(k, "prob")
    return set(zip(top["day_of_week"].astype(int), top["hour_of_day"].astype(int)))


def _metrics(predicted: set, actual: set, k: int) -> Tuple[float, float, float]:
    hits = len(predicted & actual)
    precision = hits / k if k > 0 else 0.0
    recall    = hits / len(actual) if actual else 0.0
    f1        = (2 * precision * recall / (precision + recall)
                 if (precision + recall) > 0 else 0.0)
    return round(precision, 4), round(recall, 4), round(f1, 4)


# ── Main backtest function ────────────────────────────────────────────────────

def backtest(
    records: List[Dict[str, Any]],
    test_weeks: int = 4,
    n_splits: int = 3,
    top_k: int = 10,
) -> Dict:
    """
    Rolling-window backtest.

    Parameters
    ----------
    records    : raw submission records (same format as /predict/peak_time)
    test_weeks : how many weeks of data to hold out per split
    n_splits   : number of rolling windows to evaluate
    top_k      : number of (day, hour) slots predicted as "peak"

    Returns
    -------
    Dict with precision@k, recall@k, f1@k averaged across splits,
    per-split breakdown, and a plain-English accuracy label.
    """
    if not records:
        return _empty()

    # Parse and sort records by date
    dated: List[Tuple[date, Dict]] = []
    for rec in records:
        d = _record_date(rec)
        if d is not None:
            dated.append((d, rec))
    if not dated:
        return _empty()

    dated.sort(key=lambda x: x[0])
    min_date = dated[0][0]
    max_date = dated[-1][0]
    total_days = (max_date - min_date).days
    min_required = (test_weeks + 4) * 7   # ≥ 4 weeks of training per split

    if total_days < min_required:
        return {
            **_empty(),
            "error": (
                f"Need at least {min_required} days of history to backtest "
                f"(have {total_days} days). Connect more platforms or wait for more data."
            ),
        }

    split_results = []

    for split_idx in range(n_splits):
        # Walk backwards: most recent split first
        test_end   = max_date - timedelta(weeks=split_idx * test_weeks)
        test_start = test_end - timedelta(weeks=test_weeks)

        # Ensure we have at least 4 weeks of training data before this test window
        if (test_start - min_date).days < 28:
            break

        train_recs = [rec for (d, rec) in dated if d < test_start]
        test_recs  = [rec for (d, rec) in dated if test_start <= d < test_end]

        if not train_recs or not test_recs:
            continue

        has_timestamps = any("timestamp" in r for r in test_recs)

        if has_timestamps:
            # Hour-level evaluation: compare (dow, hour) slots
            actual = _active_slots(test_recs)
            if not actual:
                continue
            try:
                model = train_from_records(train_recs)
                predicted = _top_k_slots(model, train_recs, top_k)
            except Exception:
                continue
            precision, recall, f1 = _metrics(predicted, actual, top_k)
        else:
            # Day-level evaluation: date-only records have no hour info.
            # Predict top-3 days; compare against actual active days-of-week.
            actual_days = {_record_date(r).weekday()
                           for r in test_recs if _record_date(r) and int(r.get("count", 0)) > 0}
            if not actual_days:
                continue
            top_day_k = 3
            try:
                model = train_from_records(train_recs)
                df = build_activity_frame(train_recs)
                behavioral = compute_behavioral(train_recs)
                fe = add_cyclical(df)
                fe = add_time_blocks(fe)
                fe = add_context(fe, behavioral)
                fe = add_cell_features(fe)
                X = fe[FEATURE_NAMES].values.astype(np.float32)
                proba = model.predict_proba_grid(X)
                pred_df = df[["day_of_week", "hour_of_day"]].copy()
                pred_df["prob"] = proba
                dow_avg = pred_df.groupby("day_of_week")["prob"].mean()
                predicted_days = set(dow_avg.nlargest(top_day_k).index.astype(int))
            except Exception:
                continue
            hits = len(predicted_days & actual_days)
            precision = hits / top_day_k
            recall    = hits / len(actual_days) if actual_days else 0.0
            f1        = (2 * precision * recall / (precision + recall)
                         if (precision + recall) > 0 else 0.0)
            precision, recall, f1 = round(precision, 4), round(recall, 4), round(f1, 4)
            # Reuse split structure but reflect day-level evaluation
            split_results.append({
                "split":               split_idx + 1,
                "train_records":       len(train_recs),
                "test_records":        len(test_recs),
                "test_start":          test_start.isoformat(),
                "test_end":            test_end.isoformat(),
                "top_k":               top_day_k,
                "actual_active_slots": len(actual_days),
                "hits":                hits,
                "precision":           precision,
                "recall":              recall,
                "f1":                  f1,
                "mode":                "day-level",
            })
            continue

        split_results.append({
            "split":               split_idx + 1,
            "train_records":       len(train_recs),
            "test_records":        len(test_recs),
            "test_start":          test_start.isoformat(),
            "test_end":            test_end.isoformat(),
            "top_k":               top_k,
            "actual_active_slots": len(actual),
            "hits":                int(len(predicted & actual)),
            "precision":           precision,
            "recall":              recall,
            "f1":                  f1,
        })

    if not split_results:
        return _empty()

    avg = lambda key: round(sum(r[key] for r in split_results) / len(split_results), 4)
    avg_precision = avg("precision")
    avg_recall    = avg("recall")
    avg_f1        = avg("f1")
    mode = split_results[0].get("mode", "hour-level")
    used_k = split_results[0]["top_k"]

    return {
        "precision_at_k": avg_precision,
        "recall_at_k":    avg_recall,
        "f1_at_k":        avg_f1,
        "top_k":          used_k,
        "mode":           mode,
        "n_splits":       len(split_results),
        "splits":         split_results,
        "label":          _label(avg_precision),
        "interpretation": _interpret(avg_precision, used_k, mode),
    }


# ── Labels ────────────────────────────────────────────────────────────────────

def _label(precision: float) -> str:
    if precision >= 0.80: return "Excellent"
    if precision >= 0.60: return "Good"
    if precision >= 0.40: return "Moderate"
    if precision >= 0.20: return "Weak"
    return "Poor"


def _interpret(precision: float, k: int, mode: str = "hour-level") -> str:
    pct = round(precision * 100)
    if mode == "day-level":
        return (
            f"{pct}% of the top-{k} predicted days matched actual active days "
            f"in the held-out test period (day-level evaluation — no hour timestamps available)."
        )
    return (
        f"{pct}% of the top-{k} predicted slots matched actual activity "
        f"in the held-out test period."
    )


def _empty() -> Dict:
    return {
        "precision_at_k": None,
        "recall_at_k":    None,
        "f1_at_k":        None,
        "top_k":          None,
        "n_splits":       0,
        "splits":         [],
        "label":          "Insufficient data",
        "interpretation": "Not enough history to run a backtest.",
        "error":          None,
    }
