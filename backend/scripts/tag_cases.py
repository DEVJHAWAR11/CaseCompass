"""Tag each airline/travel case with dispute types (resumable; Groq qwen model, own quota).

Why: to judge retrieval we need ground truth that does NOT come from the retrieval system.
A different model reads each case's opening facts and picks dispute types; the eval then
treats "same dispute type as the story" as relevant. Usage: python scripts/tag_cases.py --run
"""
import argparse
import asyncio
import json
import sys
from pathlib import Path

import psycopg
from openai import APIStatusError
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.chunking.chunker import chunk_judgment  # noqa: E402
from app.config import settings  # noqa: E402
from app.ikanoon.client import IKClient  # noqa: E402
from app.llm.provider import GroqProvider  # noqa: E402
from app.textstore import IKTextStore  # noqa: E402

MODEL = "qwen/qwen3.8-27b"
TYPES = ["cancel_refund", "denied_boarding", "baggage", "delay", "agent_package", "other"]
SYSTEM = (
    "Classify an Indian consumer complaint about air travel. Return JSON only: "
    '{"t":["..."]} with 1-2 values from: cancel_refund (flight cancelled/rescheduled or ticket '
    "refund refused), denied_boarding (denied boarding/offloading/overbooking), baggage "
    "(lost/damaged/pilfered baggage or cargo), delay (flight delay/missed connection), "
    "agent_package (travel agent, online travel portal, tour or holiday package), other. "
    "Main dispute first.")


class Tags(BaseModel):
    t: list[str]


async def main(run: bool):
    settings.llm_min_interval_s = 8.0  # stay under the 8,000 tokens/min free limit
    conn = psycopg.connect(settings.database_url, autocommit=True)
    todo = conn.execute(
        "select tid,title from cases where status='ingested' and category='airline_travel' and dispute_types is null "
        "order by tid").fetchall()
    print(f"{len(todo)} cases to tag, ~{len(todo) * 700:,} tokens on {MODEL} (free tier)")
    if not run:
        return
    ik, llm = IKClient(), GroqProvider()
    store = IKTextStore(ik)
    done = 0
    try:
        for tid, title in todo:
            chunks = chunk_judgment(await store.get_text(tid))
            facts = next((c.text for c in chunks if c.section == "facts"), "")[:1500]
            try:
                res = await llm.complete_json(MODEL, SYSTEM, f"{title}\n{facts}", 120, "tag")
                tags = [t for t in Tags.model_validate_json(res.text).t if t in TYPES][:2]
            except (ValueError, APIStatusError):  # model failed to emit JSON: mark "other"
                tags = []
            conn.execute("update cases set dispute_types=%s where tid=%s",
                         (json.dumps(tags or ["other"]), tid))
            done += 1
            if done % 25 == 0:
                print("  ...", done, flush=True)
    finally:
        await ik.aclose()
        print("tagged", done)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    asyncio.run(main(ap.parse_args().run))
