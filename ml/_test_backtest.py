import random; random.seed(42)
from datetime import date, timedelta
from backtest import backtest

records = []
d = date(2023, 8, 1)
while d < date(2024, 4, 1):
    if d.weekday() < 5 and random.random() < 0.8:
        hour = random.choice([21, 22, 23])
        records.append({"timestamp": str(d) + "T" + str(hour).zfill(2) + ":00:00", "count": 1})
    d += timedelta(days=1)

print("Total records:", len(records))
result = backtest(records, test_weeks=4, n_splits=3, top_k=10)
print("Label:        ", result["label"])
print("Precision@10: ", result["precision_at_k"])
print("Recall@10:    ", result["recall_at_k"])
print("F1@10:        ", result["f1_at_k"])
print("Splits run:   ", result["n_splits"])
for s in result["splits"]:
    print("  Split", s["split"],
          "| train=", s["train_records"],
          "test=", s["test_records"],
          "| hits=", s["hits"], "/", s["top_k"],
          "| P=", s["precision"], "R=", s["recall"], "F1=", s["f1"])
print(result["interpretation"])
