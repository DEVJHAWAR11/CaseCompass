"""Phase 5: offline outcome extraction for every ingested case (resumable).

Usage (from backend/):  python scripts/extract_outcomes.py --estimate | --run [--limit N]
Cases with extracted_at set are skipped, so a rate-limit pause or daily-budget stop resumes.
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.extraction.extract import (
    EXTRACTION_VERSION,
    FACTS_CHARS,
    ORDER_CHARS,
    PARTIES_CHARS,
    extract_case,
)
from app.ikanoon.client import IKClient
from app.llm.provider import GroqProvider, LLMBudgetExceeded
from app.textstore import IKTextStore


async def main(run: bool, limit: int):
    conn = psycopg.connect(settings.database_url, autocommit=True)
    todo = [r[0] for r in conn.execute(
        "select tid from cases where status='ingested' and extracted_at is null "
        "order by tid limit %s", (limit,)).fetchall()]
    per_in = (FACTS_CHARS + ORDER_CHARS + PARTIES_CHARS) // 4 + 260  # excerpt + fixed prompt
    print(f"{len(todo)} cases | ESTIMATE: {len(todo)} calls (small model first), "
          f"~{len(todo) * (per_in + 250):,} tokens (daily budget {settings.llm_daily_token_budget:,};"
          f" escalations add more). Groq free tier: no cash cost.")
    if not run:
        return
    ik = IKClient()
    store, llm = IKTextStore(ik), GroqProvider()
    n = esc = trunc = unclear = 0
    try:
        for tid in todo:
            obj, model, escalated, cut, laws = await extract_case(llm, await store.get_text(tid))
            if obj is None:  # both models failed validation: leave for retry, don't guess
                print("  validation failed twice for", tid)
                continue
            conn.execute(
                """update cases set result=%s, refund_inr=%s, compensation_inr=%s, laws_cited=%s,
                   summary=%s, category=%s, extracted_by=%s, extraction_version=%s, extracted_at=now()
                   where tid=%s""",
                (obj.r, obj.ref, obj.comp, json.dumps(laws), obj.s,
                 obj.cat, model, EXTRACTION_VERSION, tid))
            n += 1
            esc += escalated
            trunc += cut
            unclear += obj.r == "unclear"
            if n % 25 == 0:
                print(f"  ...{n} done")
    except LLMBudgetExceeded as e:
        print("stopped:", e, "- rerun to resume")
    finally:
        await ik.aclose()
        print(f"extracted {n} | escalated {esc} ({esc / max(n, 1):.0%}) | "
              f"truncated {trunc} ({trunc / max(n, 1):.0%}) | unclear {unclear}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--estimate", action="store_true")
    ap.add_argument("--limit", type=int, default=100000)
    a = ap.parse_args()
    asyncio.run(main(a.run, a.limit))
