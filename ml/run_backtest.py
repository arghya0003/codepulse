"""
Run backtest on real data pulled directly from the Neon database.

Usage:
  python run_backtest.py
"""

import os, sys
from pathlib import Path

# Load .env.local from the project root
env_path = Path(__file__).parent.parent / ".env.local"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip().strip('"'))

db_url = os.environ.get("DATABASE_URL", "")
if not db_url:
    sys.exit("DATABASE_URL not found in .env.local")

# Strip channel_binding — unsupported by psycopg2
db_url = db_url.replace("&channel_binding=require", "").replace("?channel_binding=require", "")

try:
    import psycopg2
except ImportError:
    sys.exit("Run: pip install psycopg2-binary")

print("Connecting to database...")
conn = psycopg2.connect(db_url)
cur  = conn.cursor()

# Fetch all contribution snapshots with activity
cur.execute("""
    SELECT cs.date, cs.count
    FROM contribution_snapshots cs
    JOIN platform_profiles pp ON pp.id = cs.platform_profile_id
    JOIN users u ON u.id = pp.user_id
    WHERE cs.count > 0
    ORDER BY cs.date ASC
""")
rows = cur.fetchall()
cur.close()
conn.close()

if not rows:
    sys.exit("No contribution data found. Sync a platform from the dashboard first.")

submissions = [{"date": str(row[0]), "count": int(row[1])} for row in rows]
print(f"Loaded {len(submissions)} records from {submissions[0]['date']} to {submissions[-1]['date']}")

from backtest import backtest

result = backtest(submissions, test_weeks=4, n_splits=3, top_k=10)

print()
print(f"  Label        : {result['label']}")
print(f"  Precision@10 : {result['precision_at_k']}")
print(f"  Recall@10    : {result['recall_at_k']}")
print(f"  F1@10        : {result['f1_at_k']}")
print(f"  Splits run   : {result['n_splits']}")
print()
for s in result.get("splits", []):
    print(f"  Split {s['split']} | train={s['train_records']:3d} test={s['test_records']:3d}"
          f" | hits={s['hits']}/{s['top_k']} | P={s['precision']} R={s['recall']} F1={s['f1']}")
print()
if result.get("error"):
    print("Note:", result["error"])
else:
    print(result["interpretation"])
