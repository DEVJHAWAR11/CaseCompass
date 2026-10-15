"""Write a CSV for hand-checking the AI outcome labels (50 random airline/travel cases).

Concept: the app shows AI-extracted outcomes, so we need a real accuracy number. This sheet puts
the AI's label next to the end of the judgment (where the order sits) so a person can mark what
is actually correct. Fill the blank `correct_*` columns, then run eval/score_review.py.
The sheet holds judgment excerpts, so it goes to data/review/ (gitignored); never commit it.

Usage (from backend/):  python scripts/make_review_sheet.py [--n 50] [--seed 7]
"""
import argparse
import csv
import random
import re
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import ROOT, settings  # noqa: E402

OUT = ROOT / "data" / "review" / "accuracy_sheet.csv"
COLUMNS = ["tid", "title", "ai_result", "ai_refund_inr", "ai_compensation_inr", "ai_summary",
           "order_excerpt", "judgment_url", "correct_result", "correct_refund_inr",
           "correct_compensation_inr", "notes"]


def main(n: int, seed: int):
    conn = psycopg.connect(settings.database_url, autocommit=True)
    rows = conn.execute(
        """select c.tid, c.title, c.result, c.refund_inr, c.compensation_inr, c.summary, t.text
           from cases c join case_texts t using(tid)
           where c.status='ingested' and c.category='airline_travel' and c.result is not null
           order by c.tid""").fetchall()
    random.Random(seed).shuffle(rows)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(COLUMNS)
        for tid, title, res, ref, comp, summ, text in rows[:n]:
            excerpt = re.sub(r"\s+", " ", text[-900:]).strip()
            w.writerow([tid, title, res, ref, comp, summ, excerpt,
                        f"https://indiankanoon.org/doc/{tid}/", "", "", "", ""])
    print(f"wrote {min(n, len(rows))} rows to {OUT}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=50)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    main(a.n, a.seed)
