"""Quick manual search comparison: python scripts/try_search.py "your story" """
import asyncio
import sys

import psycopg

from app.config import settings
from app.embeddings.jina import JinaEmbedder
from app.ikanoon.client import IKClient
from app.rerank.rerank import JinaReranker
from app.retrieval.search import search
from app.textstore import IKTextStore


async def main(q):
    conn = psycopg.connect(settings.database_url, autocommit=True)
    ik, emb, rr = IKClient(), JinaEmbedder("query"), JinaReranker()
    for mode in ("naive", "keyword", "hybrid", "rerank"):
        res = await search(conn, emb, q, mode=mode, top=5, reranker=rr, store=IKTextStore(ik))
        print(f"\n[{mode}]")
        for r in res:
            t = conn.execute("select title from cases where tid=%s", (r["tid"],)).fetchone()[0]
            print("  ", r["tid"], r["section"], t[:70])
    await emb.aclose(); await rr.aclose(); await ik.aclose()

asyncio.run(main(sys.argv[1]))
