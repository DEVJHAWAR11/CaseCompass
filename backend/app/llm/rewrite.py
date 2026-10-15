"""Query rewriting: one LLM call turns a plain story into up to 3 legal-style search queries.

Concept: users write "airline kept my money"; judgments say "deficiency in service, refund of
ticket cancelled flight". Rewriting bridges that vocabulary gap. HyDE (also supported)
instead asks the model to write a short fake judgment excerpt and searches with that.
"""
from pydantic import BaseModel, Field

from app.llm.cascade import run_cascade
from app.llm.provider import LLMProvider

# Fixed instructions first (helps provider-side prefix caching); the story goes last.
_SYS = ("Rewrite a consumer's story as Indian consumer-court search queries. "
        'Return JSON only: {"q":["...","..."]} with 1-3 short queries using legal terms '
        "(e.g. deficiency in service, refund, cancellation, Consumer Protection Act).")
_HYDE = ("Write a 2-sentence excerpt of how an Indian consumer commission order would describe "
         'this dispute. Return JSON only: {"q":["<excerpt>"]}.')


class Rewrite(BaseModel):
    q: list[str] = Field(min_length=1, max_length=3)


async def rewrite_query(llm: LLMProvider, story: str, hyde: bool = False) -> list[str]:
    """Never raises on LLM trouble: returns [] so search falls back to the original story."""
    try:
        obj, _, _ = await run_cascade(
            llm, _HYDE if hyde else _SYS, story[:800], Rewrite.model_validate_json,
            max_tokens=400, stage="rewrite_hyde" if hyde else "rewrite")
    except Exception:  # noqa: BLE001 - any LLM/network failure just means no rewrite
        return []
    return [q.strip() for q in obj.q if q.strip()][:3] if obj else []
