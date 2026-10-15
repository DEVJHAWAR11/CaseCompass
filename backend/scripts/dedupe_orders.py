"""Mark cases that share the same final order as duplicates (keeps the lowest tid per group).

Why: the exact-text hash used at ingest misses judgments whose headers differ but whose operative
order is identical (one common order copied across connected appeals; one group had 17 copies).
Counting each copy would inflate stats like "7 of 10 cases". Search skips non-ingested cases;
nothing is deleted, so it is reversible:  update cases set status='ingested', skip_reason=null
where skip_reason='duplicate_order'.

Usage (from backend/):  python scripts/dedupe_orders.py [--apply]   (default: dry run)
"""
import argparse
import hashlib
import re
import sys
from collections import defaultdict
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402

TAIL_CHARS = 1200


def main(apply: bool):
    conn = psycopg.connect(settings.database_url, autocommit=True)
    groups = defaultdict(list)
    for tid, text in conn.execute(
            "select c.tid, t.text from cases c join case_texts t using(tid) "
            "where c.status='ingested' order by c.tid").fetchall():
        key = hashlib.sha256(re.sub(r"[^a-z0-9]", "", text[-TAIL_CHARS:].lower()).encode()).hexdigest()
        groups[key].append(tid)
    dups = [t for v in groups.values() if len(v) > 1 for t in v[1:]]
    print(f"{sum(len(v) > 1 for v in groups.values())} groups, {len(dups)} duplicate cases "
          f"(group sizes: {sorted((len(v) for v in groups.values() if len(v) > 1), reverse=True)})")
    if apply and dups:
        conn.execute("update cases set status='skipped', skip_reason='duplicate_order' "
                     "where tid = any(%s)", (dups,))
        print("marked", len(dups), "as skipped (duplicate_order)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    main(ap.parse_args().apply)
