"""Retrieval regression: fixed stories must surface a case of the right dispute type.

Needs the real database (skipped when DATABASE_URL is not set), and the hybrid test also needs a
Jina key. Purpose: a change to chunking, fusion or SQL that quietly breaks search fails here.
Keyword mode is DB-only; hybrid mode adds query embeddings (a few hundred Jina tokens).
"""
import asyncio

import psycopg
import pytest

from app.config import settings
from app.embeddings.jina import JinaEmbedder
from app.retrieval.search import search

pytestmark = pytest.mark.skipif(not settings.database_url, reason="needs the database")

# story -> dispute type tag that at least one of the top 5 results must carry
CASES = [
    ("airline cancelled my flight and did not refund the ticket money", "cancel_refund"),
    ("denied boarding overbooked flight confirmed ticket compensation", "denied_boarding"),
    ("lost baggage airline compensation", "baggage"),
    ("flight delayed many hours no compensation", "delay"),
    ("travel agent took money for tour package and did not refund", "agent_package"),
]


def _tags(conn, tids):
    rows = conn.execute("select tid, dispute_types from cases where tid = any(%s)", (tids,)).fetchall()
    return {t: set(d or []) for t, d in rows}


@pytest.fixture(scope="module")
def conn():
    with psycopg.connect(settings.database_url) as c:
        yield c


@pytest.mark.parametrize("story,tag", CASES)
def test_keyword_search_finds_right_dispute_type(conn, story, tag):
    hits = asyncio.run(search(conn, None, story, mode="keyword", top=5))
    tags = _tags(conn, [h["tid"] for h in hits])
    assert any(tag in t for t in tags.values()), f"no {tag} case in top 5 for: {story}"


@pytest.mark.skipif(not settings.jina_api_key, reason="needs a Jina key")
@pytest.mark.parametrize("story,tag", CASES)
def test_hybrid_late_search_finds_right_dispute_type(conn, story, tag):
    async def run():
        emb = JinaEmbedder()
        return await search(conn, emb, story, mode="hybrid", top=5, late=settings.use_late_chunking)
    hits = asyncio.run(run())
    tags = _tags(conn, [h["tid"] for h in hits])
    assert any(tag in t for t in tags.values()), f"no {tag} case in top 5 for: {story}"
