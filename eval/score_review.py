"""Score the hand-checked accuracy sheet and write aggregate numbers to eval/review_results.md.

Usage:  backend/.venv/Scripts/python eval/score_review.py [sheet.csv [output.md]]
Reads data/review/accuracy_sheet.csv (rows where `correct_result` is filled in with one of
allowed / partly_allowed / dismissed / unclear). Only aggregates are written, no judgment text.
"""
import csv
import math
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
# Optional first argument: another sheet file name inside data/review/ (e.g. the after-rules copy).
SHEET = ROOT / "data" / "review" / (sys.argv[1] if len(sys.argv) > 1 else "accuracy_sheet.csv")
OUT = ROOT / "eval" / (sys.argv[2] if len(sys.argv) > 2 else "review_results.md")
CLASSES = ["allowed", "partly_allowed", "dismissed", "unclear"]


def wilson(k: int, n: int, z=1.96):
    """95% confidence interval for a proportion (honest about small samples)."""
    if n == 0:
        return 0.0, 0.0
    p = k / n
    d = 1 + z * z / n
    c = p + z * z / (2 * n)
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c - m) / d, (c + m) / d


def num(s: str):
    s = (s or "").replace(",", "").strip()
    return float(s) if s else None


def main():
    with open(SHEET, encoding="utf-8-sig", newline="") as f:
        rows = [r for r in csv.DictReader(f) if r["correct_result"].strip()]
    n = len(rows)
    if not n:
        print("no rows filled in yet")
        return
    conf = Counter((r["correct_result"].strip(), r["ai_result"]) for r in rows)
    right = sum(v for (t, a), v in conf.items() if t == a)
    lo, hi = wilson(right, n)
    out = [f"# Outcome label accuracy (reviewed by Claude from the last 900 characters of each judgment, n={n})\n",
           f"Overall: {right}/{n} = {right / n:.0%} (95% interval {lo:.0%}-{hi:.0%}).\n",
           "| class | AI said (precision) | actually (recall) |", "|---|---|---|"]
    for c in CLASSES:
        said = sum(v for (t, a), v in conf.items() if a == c)
        was = sum(v for (t, a), v in conf.items() if t == c)
        ok = conf[(c, c)]
        out.append(f"| {c} | {ok}/{said} | {ok}/{was} |")
    out += ["", "Confusion (rows = true, columns = AI):", "",
            "| true \\ AI | " + " | ".join(CLASSES) + " |", "|---" * 5 + "|"]
    for t in CLASSES:
        out.append(f"| {t} | " + " | ".join(str(conf[(t, a)]) for a in CLASSES) + " |")
    for col, ai in (("correct_refund_inr", "ai_refund_inr"), ("correct_compensation_inr", "ai_compensation_inr")):
        # Only rows where the reviewer recorded a verified true amount ("none" = no amount).
        # Blank = not verified, skipped, so this measures amount accuracy where an amount is known.
        checked = [r for r in rows if r[col].strip()]
        ok = sum(1 for r in checked
                 if num(r[ai]) == (None if r[col].strip().lower() == "none" else num(r[col])))
        out.append(f"\n{ai}: {ok}/{len(checked)} match among rows with a verified true amount.")
    OUT.write_text("\n".join(out) + "\n", encoding="utf-8")
    print("\n".join(out))


if __name__ == "__main__":
    main()
