"""
PeakTimeModel: XGBoost binary classifier + SHAP explainability + behaviour clustering.

Training is intentionally lightweight (~168 samples, <100 ms) so the model
can be trained on-the-fly per API request without a persistent model store.
"""

import joblib
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import shap
import xgboost as xgb

from feature_engineering import FEATURE_NAMES

MODEL_DIR = Path(__file__).parent / "models"
MODEL_DIR.mkdir(exist_ok=True)

_LABEL_MAP: Dict[str, tuple] = {
    "day_sin":              ("Day of week (sin)",      "Cyclical day-of-week encoding"),
    "day_cos":              ("Day of week (cos)",      "Cyclical day-of-week encoding"),
    "hour_sin":             ("Hour of day (sin)",      "Cyclical hour-of-day encoding"),
    "hour_cos":             ("Hour of day (cos)",      "Cyclical hour-of-day encoding"),
    "is_weekend":           ("Weekend",                "Saturday or Sunday"),
    "streak_length":        ("Current streak",         "Consecutive active days"),
    "prev_day_active":      ("Active yesterday",       "Was previous day active?"),
    "days_since_last_norm": ("Recency",                "Days since last coding session"),
}


class PeakTimeModel:
    def __init__(self) -> None:
        self.clf:       Optional[xgb.XGBClassifier]   = None
        self.explainer: Optional[shap.TreeExplainer]  = None

    # ── Training ──────────────────────────────────────────────────────────────

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        weights: np.ndarray,
        n_estimators: int = 100,
        max_depth: int = 4,
    ) -> "PeakTimeModel":
        pos = max(1, int(y.sum()))
        neg = max(1, int((y == 0).sum()))

        self.clf = xgb.XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=neg / pos,
            eval_metric="logloss",
            verbosity=0,
            random_state=42,
        )
        self.clf.fit(X, y, sample_weight=weights)
        self.explainer = shap.TreeExplainer(self.clf)
        return self

    # ── Prediction ────────────────────────────────────────────────────────────

    def predict_proba_grid(self, X: np.ndarray) -> np.ndarray:
        """P(active) for all 168 cells. Shape: (168,)."""
        if self.clf is None:
            raise RuntimeError("Model not trained — call train() first")
        return self.clf.predict_proba(X)[:, 1]

    # ── SHAP Explanation ──────────────────────────────────────────────────────

    def explain_cell(self, X_row: np.ndarray) -> List[Dict]:
        """
        SHAP values for one (day, hour) cell.
        Returns list of {label, delta, sub} sorted by |delta| descending.
        delta is expressed as log-odds × 100 (human-readable integer delta).
        """
        if self.explainer is None:
            raise RuntimeError("Model not trained")

        raw = self.explainer.shap_values(X_row.reshape(1, -1))
        # Handle both old (list) and new (ndarray) SHAP API
        vals: np.ndarray = raw[1][0] if isinstance(raw, list) else raw[0]

        factors = []
        for feat, v in zip(FEATURE_NAMES, vals):
            label, sub = _LABEL_MAP.get(feat, (feat, ""))
            delta = int(round(float(v) * 100))
            if abs(delta) >= 1:
                factors.append({"label": label, "delta": delta, "sub": sub})

        return sorted(factors, key=lambda x: abs(x["delta"]), reverse=True)[:6]

    # ── Behaviour Clustering ──────────────────────────────────────────────────

    @staticmethod
    def classify_behavior(proba_grid: np.ndarray) -> str:
        """
        Classify user into a behaviour archetype based on the 7×24 probability grid.
        Rule-based scoring is more robust than KMeans on 168-dim vectors.
        """
        g = proba_grid.reshape(7, 24)          # (day_of_week, hour_of_day)
        hour_avg = g.mean(axis=0)              # average over days
        dow_avg  = g.mean(axis=1)              # average over hours

        weekday_avg  = float(dow_avg[:5].mean())
        weekend_avg  = float(dow_avg[5:].mean())
        global_mean  = float(dow_avg.mean()) if dow_avg.mean() > 0 else 1e-6
        peak_day_avg = float(dow_avg.max())

        # Weekend Warrior: only wins if weekend genuinely beats weekday
        weekend_score = weekend_avg if weekend_avg > weekday_avg * 1.15 else 0.0

        # Consistent Grinder: codes 5+ days/week at comparable intensity
        days_above_half = int((dow_avg > global_mean * 0.5).sum())
        consistent_score = (global_mean * 1.2) if days_above_half >= 5 else 0.0

        # Binge Coder: 1-2 heavy days, rest near zero
        active_day_count = int((dow_avg > global_mean * 0.4).sum())
        binge_ratio      = peak_day_avg / global_mean
        binge_score = (peak_day_avg * 0.75) if (active_day_count <= 2 and binge_ratio >= 2.0) else 0.0

        scores = {
            "Early Bird":         float(hour_avg[6:11].mean()),
            "Lunch Coder":        float(hour_avg[11:15].mean()),
            "9-to-5 Coder":       float(hour_avg[9:17].mean()),
            "Afternoon Coder":    float(hour_avg[14:19].mean()),
            "Evening Coder":      float(hour_avg[18:23].mean()),
            "Night Owl":          float(np.concatenate([hour_avg[22:], hour_avg[:3]]).mean()),
            "Late Night Hacker":  float(hour_avg[0:5].mean()),
            "Weekend Warrior":    weekend_score,
            "Consistent Grinder": consistent_score,
            "Binge Coder":        binge_score,
        }
        return max(scores, key=scores.__getitem__)

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self, name: str = "peak_time") -> Path:
        path = MODEL_DIR / f"{name}.pkl"
        joblib.dump(self, path)
        return path

    @classmethod
    def load(cls, name: str = "peak_time") -> "PeakTimeModel":
        return joblib.load(MODEL_DIR / f"{name}.pkl")
