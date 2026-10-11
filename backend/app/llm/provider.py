"""LLM provider interface + Groq implementation.

Concept: the rest of the app talks to `LLMProvider.complete_json(...)` and never to Groq
directly, so swapping providers is one new class. Every call is: cached on disk by
hash(model, prompt, input) -> budget-checked -> throttled -> retried with backoff on rate
limits -> logged (tokens) to the usage ledger.
"""
import asyncio
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Protocol

from openai import APIConnectionError, APIStatusError, AsyncOpenAI, RateLimitError

from app.config import settings
from app.usage.ledger import _conn, log_usage


class LLMBudgetExceeded(Exception):
    """Daily token budget hit: callers should degrade (e.g. skip rewriting), not crash."""


@dataclass
class LLMResult:
    text: str
    model: str
    tokens_in: int
    tokens_out: int
    cached: bool


class LLMProvider(Protocol):
    async def complete_json(self, model: str, system: str, user: str, max_tokens: int,
                            stage: str) -> LLMResult: ...


def tokens_today() -> int:
    with _conn() as c:
        return c.execute(
            """select coalesce(sum(tokens_in+tokens_out),0) from usage_log
               where service='groq' and not cached and at > now() - interval '1 day'"""
        ).fetchone()[0]


class GroqProvider:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
        self.cache = settings.cache_path / "llm"
        self.cache.mkdir(parents=True, exist_ok=True)
        self._last = 0.0

    async def complete_json(self, model, system, user, max_tokens, stage):
        key = hashlib.sha256(json.dumps([model, system, user, max_tokens]).encode()).hexdigest()
        cp = self.cache / f"{key[:32]}.json"
        if cp.exists():
            d = json.loads(cp.read_text(encoding="utf-8"))
            log_usage("groq", model, stage, cached=True)
            return LLMResult(d["text"], model, d["in"], d["out"], True)
        if tokens_today() >= settings.llm_daily_token_budget:
            raise LLMBudgetExceeded("daily LLM token budget reached")
        for attempt in range(10):
            wait = settings.llm_min_interval_s - (time.monotonic() - self._last)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last = time.monotonic()
            try:
                r = await self.client.chat.completions.create(
                    model=model, max_tokens=max_tokens, response_format={"type": "json_object"},
                    reasoning_effort="low",
                    messages=[{"role": "system", "content": system},
                              {"role": "user", "content": user}])
                break
            except RateLimitError as e:
                # Groq says how long to wait (per-minute token window); honor it.
                ra = e.response.headers.get("retry-after") if e.response is not None else None
                await asyncio.sleep(min(90, float(ra) + 1 if ra else 5 * 2 ** min(attempt, 4)))
            except (APIConnectionError, APIStatusError) as e:
                if isinstance(e, APIStatusError) and e.status_code < 500:
                    raise
                await asyncio.sleep(2 ** attempt)
        else:
            raise RuntimeError("Groq unreachable or rate limited after retries")
        text = r.choices[0].message.content or ""
        tin, tout = r.usage.prompt_tokens, r.usage.completion_tokens
        log_usage("groq", model, stage, tokens_in=tin, tokens_out=tout)
        cp.write_text(json.dumps({"text": text, "in": tin, "out": tout}), encoding="utf-8")
        return LLMResult(text, model, tin, tout, False)
