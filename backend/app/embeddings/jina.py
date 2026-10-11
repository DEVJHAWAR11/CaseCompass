"""Jina embeddings client.

Concepts:
- Query vs passage task types: Jina models embed "what you search with" and "what you search
  in" differently; we always use retrieval.query for user text and retrieval.passage for chunks.
- Late chunking: instead of embedding each chunk alone, the model reads ALL chunks of a document
  together and then splits the vectors, so every chunk vector "knows" the surrounding context.
- Everything is disk-cached by hash, throttled to the free limits, retried with backoff, and
  logged to the usage ledger (tokens count toward the 10M free pool).
"""
import asyncio
import hashlib
import json
import time
from collections import deque
from pathlib import Path
from typing import Protocol

import httpx

from app.config import settings
from app.usage.ledger import check_jina_pool, log_usage

URL = "https://api.jina.ai/v1/embeddings"


class Embedder(Protocol):
    async def embed(self, texts: list[str], task: str, late: bool = False) -> list[list[float]]: ...


def est_tokens(s: str) -> int:
    return max(1, len(s) // 4)  # rough: ~4 chars per token


class Throttle:
    """Sliding 60-second window limiting both requests and tokens per minute."""

    def __init__(self, max_req: int, max_tok: int):
        self.max_req, self.max_tok, self.hits = max_req, max_tok, deque()

    async def wait(self, tokens: int):
        while True:
            now = time.monotonic()
            while self.hits and now - self.hits[0][0] > 60:
                self.hits.popleft()
            if (len(self.hits) < self.max_req * 0.9
                    and sum(t for _, t in self.hits) + tokens < self.max_tok * 0.9):
                self.hits.append((now, tokens))
                return
            await asyncio.sleep(1.0)


class JinaEmbedder:
    def __init__(self, stage: str = "embed"):
        self.stage = stage
        self.cache = settings.cache_path / "jina_embed"
        self.cache.mkdir(parents=True, exist_ok=True)
        self.throttle = Throttle(settings.jina_max_req_per_min, settings.jina_max_tokens_per_min)
        self.http = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {settings.jina_api_key}"}, timeout=90)

    async def aclose(self):
        await self.http.aclose()

    async def embed(self, texts, task, late=False):
        key = hashlib.sha256(json.dumps(
            [settings.embed_model, settings.embed_dim, task, late, texts]).encode()).hexdigest()
        cp: Path = self.cache / f"{key[:32]}.json"
        if cp.exists():
            log_usage("jina", settings.embed_model, self.stage, cached=True)
            return json.loads(cp.read_text())
        est = sum(est_tokens(t) for t in texts)
        check_jina_pool(est)  # raises JinaPoolExhausted at the hard stop
        body = {"model": settings.embed_model, "task": task, "input": texts,
                "dimensions": settings.embed_dim, "normalized": True, "truncate": True}
        if late:
            body["late_chunking"] = True
        for attempt in range(6):
            await self.throttle.wait(est)
            try:
                r = await self.http.post(URL, json=body)
            except httpx.HTTPError:
                r = None
            if r is not None and r.status_code == 200:
                break
            if r is not None and r.status_code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f"Jina embeddings HTTP {r.status_code}: {r.text[:120]}")
            await asyncio.sleep(2 ** attempt)
        else:
            raise RuntimeError("Jina embeddings unreachable after retries")
        j = r.json()
        vecs = [d["embedding"] for d in sorted(j["data"], key=lambda d: d["index"])]
        log_usage("jina", settings.embed_model, self.stage + ("_late" if late else ""),
                  tokens_in=j["usage"]["total_tokens"], note=task)
        cp.write_text(json.dumps(vecs))
        return vecs
