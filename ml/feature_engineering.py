"""
Feature engineering for the peak-time XGBoost model.

Given the 168-cell activity DataFrame from data_preprocessing.py:
  - Cyclical sine/cosine encodings for day-of-week and hour-of-day
  - Context features (is_weekend, streak, recency)
  - Exponential time-decay sample weights

Feature names are exported so model.py can reference them for SHAP labels.
"""

from typing import Dict, Tuple

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "day_sin",
    "day_cos",
    "hour_sin",
    "hour_cos",
    "is_weekend",
    "streak_length",
    "prev_day_active",
    "days_since_last_norm",
]


def add_cyclical(df: pd.DataFrame) -> pd.DataFrame:
    """Encode day_of_week and hour_of_day as (sin, cos) pairs."""
    df = df.copy()
    df["day_sin"]  = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["day_cos"]  = np.cos(2 * np.pi * df["day_of_week"] / 7)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)
    return df


def add_context(df: pd.DataFrame, behavioral: Dict[str, int]) -> pd.DataFrame:
    """Add weekend flag and behavioral features (constant across all cells)."""
    df = df.copy()
    df["is_weekend"]           = (df["day_of_week"] >= 5).astype(int)
    df["streak_length"]        = behavioral.get("streak_length", 0)
    df["prev_day_active"]      = behavioral.get("prev_day_active", 0)
    # Normalize to [0, 1]; 0 = active today, 1 = inactive for ≥ 365 days
    df["days_since_last_norm"] = min(365, behavioral.get("days_since_last", 365)) / 365.0
    return df


def compute_weights(df: pd.DataFrame, lam: float = 0.005) -> np.ndarray:
    """
    Exponential decay: w = exp(-lam * days_old).
    Active cells receive a 3× boost to counteract heavy class imbalance
    (most of the 168 cells are inactive for any given user).
    """
    weights = np.exp(-lam * df["days_old"].values.astype(np.float64))
    weights[df["active"].values == 1] *= 3.0
    return weights


def build_matrices(
    df: pd.DataFrame,
    behavioral: Dict[str, int],
    lam: float = 0.005,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return (X, y, sample_weights) ready for XGBoost.fit."""
    df = add_cyclical(df)
    df = add_context(df, behavioral)
    X = df[FEATURE_NAMES].values.astype(np.float32)
    y = df["active"].values.astype(int)
    w = compute_weights(df, lam)
    return X, y, w
