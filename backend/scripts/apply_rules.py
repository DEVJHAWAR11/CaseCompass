"""Apply the code-side rules to extracted cases (reads our own case_texts, zero IK calls).

1. rule_override: wording in the final order that settles the outcome ("partly allowed",
   "complaint dismissed").
2. op_appeal_dismissed: the airline/agent's appeal was dismissed, so the award stands. Only
   used to turn an 'unclear' into 'allowed'; the review sheet showed the model leaving these unclear.
3. amounts_from_order: fills compensation ONLY where the model gave none (never overwrites).
"""
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402
from app.extraction.extract import amounts_from_order, op_appeal_dismissed, rule_override  # noqa: E402


def main():
    conn = psycopg.connect(settings.database_url, autocommit=True)
    changed, filled = {}, 0
    rows = conn.execute(
        "select c.tid, c.result, c.compensation_inr, t.text from cases c "
        "join case_texts t using(tid) where c.extracted_at is not null").fetchall()
    for tid, old, comp, text in rows:
        new = rule_override(text)
        if new is None and old == "unclear" and op_appeal_dismissed(text):
            new = "allowed"
        res = new or old
        if new and new != old:
            conn.execute("update cases set result=%s where tid=%s", (new, tid))
            changed[(old, new)] = changed.get((old, new), 0) + 1
        if comp is None:
            _, rx_comp = amounts_from_order(text, res)
            if rx_comp:
                conn.execute("update cases set compensation_inr=%s where tid=%s", (rx_comp, tid))
                filled += 1
    print("changed:", changed, "| compensation filled by code:", filled)
    print(conn.execute("select result,count(*) from cases where extracted_at is not null "
                       "group by 1 order by 1").fetchall())


if __name__ == "__main__":
    main()
