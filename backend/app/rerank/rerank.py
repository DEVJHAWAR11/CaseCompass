"""Rerankers behind one interface. A reranker re-reads the query and each candidate together
(a cross-encoder) and scores them jointly, which is slower but more precise than comparing
two precomputed vectors. NoRerank is the pass-through used as the eval baseline."""
import asyncio
import hashlib
import json
from typing import Protocol

import httpx

from app.config import settings
from app.embeddings.jina import Throttle, est_tokens
from app.usage.ledger import check_jina_pool, log_usage


class Reranker(Protocol):
    async def rerank(self, query: str, docs: list[str]) -> list[float]: ...


class NoRerank:
    async def rerank(self, query, docs):  # keep the incoming order
        return [float(len(docs) - i) for i in range(len(docs))]


class JinaReranker:
    def __init__(self):
        self.throttle = Throttle(settings.jina_max_req_per_min, settings.jina_max_tokens_per_min)
        self.http = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {settings.jina_api_key}"}, timeout=90)
        self.cache = settings.cache_path / "jina_rerank"
        self.cache.mkdir(parents=True, exist_ok=True)

    async def aclose(self):
        await self.http.aclose()

    async def rerank(self, query, docs):
        key = hashlib.sha256(json.dumps([settings.rerank_model, query, docs]).encode()).hexdigest()
        cp = self.cache / f"{key[:32]}.json"
        if cp.exists():  # identical request seen before: free
            log_usage("jina", settings.rerank_model, "rerank", cached=True)
            return json.loads(cp.read_text())
        est = est_tokens(query) * len(docs) + sum(est_tokens(d) for d in docs)
        check_jina_pool(est)
        for attempt in range(5):
            await self.throttle.wait(est)
            r = await self.http.post("https://api.jina.ai/v1/rerank", json={
                "model": settings.rerank_model, "query": query, "documents": docs,
                "top_n": len(docs)})
            if r.status_code == 200:
                j = r.json()
                log_usage("jina", settings.rerank_model, "rerank",
                          tokens_in=j["usage"]["total_tokens"])
                scores = [0.0] * len(docs)
                for x in j["results"]:
                    scores[x["index"]] = x["relevance_score"]
                cp.write_text(json.dumps(scores))
                return scores
            if r.status_code not in (429, 500, 502, 503, 504):
                raise RuntimeError(f"Jina rerank HTTP {r.status_code}: {r.text[:120]}")
            await asyncio.sleep(2 ** attempt)
        raise RuntimeError("Jina rerank unreachable after retries")
