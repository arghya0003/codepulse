"""
Training orchestration for PeakTimeModel.

Usage as a CLI script:
  python train.py --input submissions.json [--output peak_time] [--lambda-decay 0.005]

submissions.json format:
  [
    {"date": "2024-01-15", "count": 5},
    {"timestamp": "2024-01-16T20:30:00", "count": 1},
    ...
  ]
"""

import argparse
import json
from typing import Any, Dict, List

from data_preprocessing import build_activity_frame, compute_behavioral
from feature_engineering import build_matrices
from model import PeakTimeModel


def train_from_records(
    records: List[Dict[str, Any]],
    lam: float = 0.005,
) -> PeakTimeModel:
    """Train a PeakTimeModel from raw submission records. Returns the trained model."""
    df = build_activity_frame(records)
    behavioral = compute_behavioral(records)
    X, y, weights = build_matrices(df, behavioral, lam)
    return PeakTimeModel().train(X, y, weights)


def main() -> None:
    ap = argparse.ArgumentParser(description="Train the peak-time XGBoost model")
    ap.add_argument("--input",        required=True, help="JSON file with submission records")
    ap.add_argument("--output",       default="peak_time", help="Saved model name (no extension)")
    ap.add_argument("--lambda-decay", type=float, default=0.005, dest="lam",
                    help="Time-decay lambda (default 0.005 ≈ 200-day half-life)")
    args = ap.parse_args()

    with open(args.input) as f:
        records: List[Dict[str, Any]] = json.load(f)

    print(f"[train] Loaded {len(records)} records")
    model = train_from_records(records, lam=args.lam)
    path = model.save(args.output)
    print(f"[train] Model saved → {path}")


if __name__ == "__main__":
    main()
