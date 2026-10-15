"""Pipeline variants compared in the eval. Each takes a story and returns ordered case ids.

Stage names match the README table: naive vector -> +hybrid -> +rerank -> +rewriting -> +graph.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

import psycopg  # noqa: E402

from app.config import settings  # noqa: E402
from app.embeddings.jina import JinaEmbedder  # noqa: E402
from app.graph.citation_graph import expand, load_graph  # noqa: E402
from app.ikanoon.client import IKClient  # noqa: E402
from app.llm.provider import GroqProvider  # noqa: E402
from app.llm.rewrite import rewrite_query  # noqa: E402
from app.rerank.rerank import JinaReranker  # noqa: E402
from app.retrieval.search import search  # noqa: E402
from app.textstore import IKTextStore  # noqa: E402

TOP = 10


class Env:
    """Shared clients so every variant reuses the same caches (rewrites, embeddings, reranks)."""

    def __init__(self):
        self.conn = psycopg.connect(settings.database_url, autocommit=True)
        self.emb, self.rr, self.llm = JinaEmbedder("eval"), JinaReranker(), GroqProvider()
        self.ik = IKClient()
        self.store = IKTextStore(self.ik)
        self.graph = load_graph(self.conn)
        self.corpus = {r[0] for r in self.conn.execute(
            "select tid from cases where status='ingested' and category='airline_travel'")}

    async def aclose(self):
        await self.emb.aclose()
        await self.rr.aclose()
        await self.ik.aclose()

    async def run(self, story, mode, late=False, queries=None, rerank_source="derived"):
        res = await search(self.conn, self.emb, story, mode=mode, top=TOP, late=late,
                           reranker=self.rr, store=self.store, queries=queries,
                           rerank_source=rerank_source)
        return [r["tid"] for r in res]


async def v_naive(env, s):          return await env.run(s, "naive")
async def v_keyword(env, s):        return await env.run(s, "keyword")
async def v_hybrid(env, s):         return await env.run(s, "hybrid")
async def v_rerank(env, s):         return await env.run(s, "rerank")
async def v_rerank_passage(env, s):  return await env.run(s, "rerank", rerank_source="passage")
async def v_naive_late(env, s):     return await env.run(s, "naive", late=True)
async def v_hybrid_late(env, s):    return await env.run(s, "hybrid", late=True)


async def v_rewrite(env, s):
    return await env.run(s, "rerank", queries=await rewrite_query(env.llm, s))


async def v_hybrid_rewrite(env, s):
    """Rewriting + hybrid fusion, NO reranker: needs no judgment text and no rerank tokens."""
    return await env.run(s, "hybrid", queries=await rewrite_query(env.llm, s))


async def v_hybrid_rewrite_late(env, s):
    """Same as the shipped default but searching the late-chunking vectors."""
    return await env.run(s, "hybrid", late=True, queries=await rewrite_query(env.llm, s))


async def v_hyde(env, s):
    return await env.run(s, "rerank", queries=await rewrite_query(env.llm, s, hyde=True))


async def v_graph(env, s):
    """Rewrite+rerank, then replace the last 3 slots with graph-related cases of the top 3."""
    top = await v_rewrite(env, s)
    extra = [t for t in expand(env.graph, top[:3], env.corpus, k=6) if t not in top[:7]][:3]
    return top[:7] + extra


# (label, function) in table order. Cumulative stages first, then ablations.
STAGES = [
    ("1. naive vector search", v_naive),
    ("2. + hybrid (vector + keyword, RRF)", v_hybrid),
    ("3. + Jina rerank (on our derived text)", v_rerank),
    ("4. + query rewriting", v_rewrite),
    ("5. + citation-graph expansion", v_graph),
]
ABLATIONS = [
    ("keyword only (basic search)", v_keyword),
    ("naive, late chunking", v_naive_late),
    ("hybrid, late chunking", v_hybrid_late),
    ("hybrid, no rerank (= stage 2)", v_hybrid),
    ("hybrid + rerank on derived text (= stage 3, shipped)", v_rerank),
    ("hybrid + rerank on matched passage (needs live IK fetch)", v_rerank_passage),
    ("hybrid + rewriting, no rerank (shipped default)", v_hybrid_rewrite),
    ("hybrid + rewriting, late chunking", v_hybrid_rewrite_late),
    ("rewriting via HyDE instead", v_hyde),
]
