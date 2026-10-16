"""Phase 3: chunk every ingested case and embed the chunks (offline; vectors go to the DB).

Per case: 2 Jina requests - standard embeddings and late-chunking embeddings (for the eval
ablation). Judgment text is held in memory only; the DB gets offsets, vectors and stemmed
keyword lexemes. Resumable: cases that already have chunks are skipped.

Usage (from backend/):  python scripts/embed_corpus.py --estimate | --run
"""
import argparse
import asyncio
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.chunking.chunker import chunk_judgment, context_line
from app.config import settings
from app.embeddings.jina import JinaEmbedder, est_tokens
from app.ikanoon.client import IKClient
from app.textstore import IKTextStore
from app.usage.ledger import JinaPoolExhausted, jina_used


async def main(run: bool, limit: int):
    ik = IKClient()
    store = IKTextStore(ik)
    emb = JinaEmbedder()
    conn = psycopg.connect(settings.database_url, autocommit=True)
    cases = conn.execute(
        """select tid,title,court,extract(year from decided_on)::int,category from cases
           where status='ingested' and not exists (select 1 from chunks where chunks.tid=cases.tid)
           order by tid limit %s""", (limit,)).fetchall()
    plan, total = [], 0
    for tid, title, court, year, cat in cases:
        chunks = chunk_judgment(await store.get_text(tid))  # cached text: free
        texts = [context_line(title, court, year, c.section, cat) + c.text for c in chunks]
        plan.append((tid, chunks, texts))
        total += sum(est_tokens(t) for t in texts)
    print(f"{len(plan)} cases, {sum(len(p[1]) for p in plan)} chunks")
    print(f"ESTIMATE: {2 * len(plan)} Jina requests, ~{2 * total:,} tokens "
          f"(standard + late) = {2 * total / settings.jina_pool_tokens:.1%} of the 10M free pool; "
          f"already used {jina_used():,}. Cost: free tier.")
    if not run:
        return
    try:
        for n, (tid, chunks, texts) in enumerate(plan, 1):
            std = await emb.embed(texts, "retrieval.passage", late=False)
            late = await emb.embed(texts, "retrieval.passage", late=True)
            with conn.transaction():
                for c, t, v1, v2 in zip(chunks, texts, std, late):
                    conn.execute(
                        """insert into chunks(tid,section,idx,char_start,char_end,tokens_est,
                           embed_model,embed_dim,emb,emb_late,tsv)
                           values(%s,%s,%s,%s,%s,%s,%s,%s,%s::vector,%s::vector,
                                  to_tsvector('english', %s)) on conflict(tid,idx) do nothing""",
                        (tid, c.section, c.idx, c.start, c.end, est_tokens(t),
                         settings.embed_model, settings.embed_dim, str(v1), str(v2), c.text))
            if n % 20 == 0:
                print(f"  ...{n}/{len(plan)} cases, jina tokens used {jina_used():,}")
    except JinaPoolExhausted as e:
        print("stopped:", e, "- rerun to resume")
    finally:
        await emb.aclose()
        await ik.aclose()
        print("chunks in DB:", conn.execute("select count(*) from chunks").fetchone()[0],
              "| jina tokens used:", f"{jina_used():,}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--estimate", action="store_true")
    ap.add_argument("--limit", type=int, default=100000)
    a = ap.parse_args()
    asyncio.run(main(a.run, a.limit))
