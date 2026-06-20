"""
Feature engineering for the peak-time XGBoost model.

Given the 168-cell activity DataFrame from data_preprocessing.py:
  - Cyclical sine/cosine encodings for day-of-week and hour-of-day
  - Explicit time-block flags (morning / afternoon / evening / night)
  - Context features (is_weekend, streak, recency)
  - Per-cell features (hit counts, recency score, days since active)
  - Exponential time-decay sample weights
  - Soft regression label (log1p-normalised hit count)
"""

from typing import Dict, Tuple

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    # Cyclical time encodings
    "day_sin",
    "day_cos",
    "hour_sin",
    "hour_cos",
    # Explicit time-block flags (easier for tree splits than sin/cos alone)
    "is_weekend",
    "is_morning",
    "is_afternoon",
    "is_evening",
    "is_night",
    # Global user-state scalars
    "streak_length",
    "prev_day_active",
    "days_since_last_norm",
    # Per-cell features (the key improvement over v1)
    "cell_hit_count_norm",
    "cell_hit_count_30d_norm",
    "cell_hit_count_90d_norm",
    "cell_days_since_active_norm",
    "cell_recency_score_norm",
]


def add_cyclical(df: pd.DataFrame) -> pd.DataFrame:
    """Encode day_of_week and hour_of_day as (sin, cos) pairs."""
    df = df.copy()
    df["day_sin"]  = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    return df


def add_time_blocks(df: pd.DataFrame) -> pd.DataFrame:
    """Explicit hour-of-day block flags. Easier for tree splits than sin/cos alone."""
    df = df.copy()
    h = df["hour_of_day"]
    df["is_morning"]   = ((h >= 6)  & (h <= 11)).astype(int)
    df["is_afternoon"] = ((h >= 12) & (h <= 17)).astype(int)
    df["is_evening"]   = ((h >= 18) & (h <= 22)).astype(int)
    df["is_night"]     = ((h >= 23) | (h <= 5)).astype(int)
    return df


def add_context(df: pd.DataFrame, behavioral: Dict[str, int]) -> pd.DataFrame:
    """Add weekend flag and global behavioral features (constant across all cells)."""
    df = df.copy()
    df["is_weekend"]           = (df["day_of_week"] >= 5).astype(int)
    df["streak_length"]        = behavioral.get("streak_length", 0)
    df["prev_day_active"]      = behavioral.get("prev_day_active", 0)
    df["days_since_last_norm"] = min(365, behavioral.get("days_since_last", 365)) / 365.0
    return df


def add_cell_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalise per-cell stats from build_activity_frame into [0, 1] features.
    These are the key discriminators — they tell the model HOW OFTEN
    a user codes at each specific (day, hour) slot.
    """
    df = df.copy()
    max_hits    = max(1, int(df["cell_hit_count"].max()))
    max_recency = max(1e-6, float(df["cell_recency_score"].max()))

    df["cell_hit_count_norm"]          = df["cell_hit_count"] / max_hits
    df["cell_hit_count_30d_norm"]      = df["cell_hit_count_30d"] / max_hits
    df["cell_hit_count_90d_norm"]      = df["cell_hit_count_90d"] / max_hits
    df["cell_days_since_active_norm"]  = df["cell_days_since_active"].clip(0, 365) / 365.0
    df["cell_recency_score_norm"]      = df["cell_recency_score"] / max_recency
    return df


def compute_weights(df: pd.DataFrame, lam: float = 0.005) -> np.ndarray:
    """
    Exponential decay: w = exp(-lam * min(days_old, 365)).
    Capped at 365 so records older than a year aren't discounted below
    the no-hit cell baseline weight, which would invert the intended 3× boost
    for active cells and cause the model to predict the mean for everything.
    """
    days_capped = np.clip(df["days_old"].values.astype(np.float64), 0, 365)
    weights = np.exp(-lam * days_capped)
    weights[df["cell_hit_count"].values > 0] *= 3.0
    return weights


def build_matrices(
    df: pd.DataFrame,
    behavioral: Dict[str, int],
    lam: float = 0.005,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Return (X, y_soft, sample_weights) ready for XGBoost regression.

    y is a log1p-normalised soft label in [0, 1] representing how active
    a cell is relative to the user's most active slot. This preserves the
    difference between "coded here once" vs "codes here every week" — unlike
    binary active/inactive which treats them identically.
    """
    df = add_cyclical(df)
    df = add_time_blocks(df)
    df = add_context(df, behavioral)
    df = add_cell_features(df)

    X = df[FEATURE_NAMES].values.astype(np.float32)

    # Soft regression label: log1p-normalised hit count
    max_hits = max(1, int(df["cell_hit_count"].max()))
    y = np.log1p(df["cell_hit_count"].values.astype(np.float64)) / np.log1p(max_hits)

    w = compute_weights(df, lam)
    return X, y.astype(np.float32), w
