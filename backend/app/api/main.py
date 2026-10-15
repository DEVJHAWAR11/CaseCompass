"""FastAPI app: /health, /search, /case/{tid}, /usage.

Safety controls: per-IP rate limit on /search, daily LLM token budget and Jina pool guards
(inside the clients), friendly errors instead of stack traces. No secrets are ever returned.
"""
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.chunking.chunker import clean_text  # noqa: F401  (kept for offset consistency)
from app.config import settings
from app.embeddings.jina import JinaEmbedder
from app.graph.citation_graph import load_graph
from app.ikanoon.client import IKClient, IKError
from app.llm.provider import GroqProvider, tokens_today
from app.rerank.rerank import JinaReranker
from app.retrieval.pipeline import Services, run_search
from app.textstore import make_text_store
from app.usage.ledger import jina_used

ATTRIBUTION = ("Case text and citations are provided by Indian Kanoon (indiankanoon.org). "
               "CaseCompass is not endorsed by or affiliated with Indian Kanoon.")
DISCLAIMER = ("This is information, not legal advice. Outcomes are AI-generated from public "
              "records and may contain errors.")


def _db():
    return psycopg.connect(settings.database_url, autocommit=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    conn = _db()
    ik = IKClient()
    app.state.sv = Services(
        emb=JinaEmbedder("query"), rr=JinaReranker(), llm=GroqProvider(), ik=ik,
        store=make_text_store(ik), graph=load_graph(conn),
        corpus={r[0] for r in conn.execute(
            "select tid from cases where status='ingested' and category='airline_travel'")})
    conn.close()
    app.state.hits = defaultdict(deque)
    yield
    await app.state.sv.ik.aclose()


app = FastAPI(title="CaseCompass API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","),
                   allow_methods=["GET", "POST"], allow_headers=["*"])


def check_rate_limit(request: Request):
    """Sliding-window limit per client IP (X-Forwarded-For first: we sit behind a proxy)."""
    fwd = request.headers.get("x-forwarded-for")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")
    q, now = request.app.state.hits[ip], time.monotonic()
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= settings.rate_limit_per_min:
        raise HTTPException(429, "Too many searches. Please wait a minute and try again.")
    q.append(now)


class SearchRequest(BaseModel):
    story: str = Field(min_length=5, max_length=1500)
    mode: Literal["naive", "hybrid", "full"] = "full"
    top: int = Field(default=10, ge=1, le=10)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/search")
async def search_endpoint(body: SearchRequest, request: Request):
    check_rate_limit(request)
    conn = _db()
    try:
        out = await run_search(request.app.state.sv, conn, body.story, body.mode, body.top)
    except psycopg.Error:
        raise HTTPException(503, "The database is unreachable right now. Please try again shortly.")
    finally:
        conn.close()
    return out | {"disclaimer": DISCLAIMER, "attribution": ATTRIBUTION}


@app.get("/case/{tid}")
async def case_endpoint(tid: int, request: Request):
    """Case metadata plus the judgment text fetched live from Indian Kanoon (cached)."""
    conn = _db()
    try:
        row = conn.execute("select title,court,decided_on,result,summary,source_url from cases "
                           "where tid=%s", (tid,)).fetchone()
    finally:
        conn.close()
    if not row:
        raise HTTPException(404, "Case not found.")
    try:
        text = await request.app.state.sv.store.get_text(tid)
        note = None
    except IKError:
        text, note = None, "The full judgment is temporarily unavailable. Use the source link."
    return {"tid": tid, "title": row[0], "court": row[1], "decided_on": str(row[2]),
            "result": row[3], "summary_ai": row[4], "source_url": row[5], "text": text,
            "notice": note, "disclaimer": DISCLAIMER, "attribution": ATTRIBUTION}


@app.get("/passage/{tid}")
async def passage_endpoint(tid: int, start: int, end: int, request: Request):
    """The matched passage of one case, fetched live from Indian Kanoon (disk-cached).
    Called only when a user opens "Why this result": at most one IK call per click, none
    during search itself. Offsets come from the search response; we bound them."""
    if not (0 <= start < end <= start + 3000):
        raise HTTPException(400, "Invalid passage range.")
    try:
        text = await request.app.state.sv.store.get_text(tid)
    except IKError:
        raise HTTPException(503, "The passage is temporarily unavailable. Use the source link.")
    return {"tid": tid, "passage": text[start:end][:1500], "attribution": ATTRIBUTION}


@app.get("/usage")
def usage():
    """Non-sensitive running totals for the cost dashboards in the README."""
    return {"jina_tokens_used": jina_used(), "jina_pool": settings.jina_pool_tokens,
            "groq_tokens_last_24h": tokens_today(),
            "groq_daily_budget": settings.llm_daily_token_budget}
