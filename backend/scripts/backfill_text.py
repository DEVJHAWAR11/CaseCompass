"""Copy cleaned judgment text for every ingested case into case_texts.

Reads from the local Indian Kanoon response cache first, so it costs 0 INR for cases we already
fetched; any case missing from the cache is fetched live (0.20 INR each) and reported.
Usage (from backend/):  python scripts/backfill_text.py
"""
import asyncio
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402
from app.ikanoon.client import IKClient  # noqa: E402
from app.textstore import IKTextStore  # noqa: E402


async def main():
    conn = psycopg.connect(settings.database_url, autocommit=True)
    ik = IKClient()
    live_before = ik.live_calls
    store = IKTextStore(ik)
    todo = [r[0] for r in conn.execute(
        "select tid from cases where status='ingested' and tid not in (select tid from case_texts)")]
    print(f"{len(todo)} cases to copy")
    done = 0
    for tid in todo:
        text = await store.get_text(tid)
        conn.execute("insert into case_texts(tid,text,chars) values(%s,%s,%s) on conflict do nothing",
                     (tid, text, len(text)))
        done += 1
    n, mb = conn.execute("select count(*), round(sum(chars)/1e6,2) from case_texts").fetchone()
    print(f"copied {done} | table now {n} rows, {mb} M characters | live IK calls: "
          f"{ik.live_calls - live_before} | spent INR {ik.spent()}")
    await ik.aclose()

asyncio.run(main())
