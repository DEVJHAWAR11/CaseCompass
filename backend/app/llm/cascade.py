"""Model cascade: cheapest adequate model first, escalate only when the output is unusable.

Concept: most calls succeed on the small model. If its JSON fails Pydantic validation, or
the parsed result says it is "unclear", we retry once with the larger model. Every escalation
is logged (usage_log.note starts with 'escalated'), so the escalation rate can be reported.
"""
from typing import Callable, TypeVar

from pydantic import ValidationError

from app.config import settings
from app.llm.provider import LLMProvider
from app.usage.ledger import log_usage

T = TypeVar("T")


async def run_cascade(llm: LLMProvider, system: str, user: str, parse: Callable[[str], T],
                      max_tokens: int, stage: str,
                      is_unclear: Callable[[T], bool] = lambda x: False):
    """Returns (parsed_or_None, model_used, escalated). parse() must raise on bad output."""
    last = None
    for i, model in enumerate([settings.llm_small_model, settings.llm_large_model]):
        try:
            res = await llm.complete_json(model, system, user, max_tokens, stage)
            obj = parse(res.text)
            if i == 0 and is_unclear(obj):
                last = obj
                log_usage("groq", model, stage, note="escalated:unclear", cached=True)
                continue
            return obj, model, i == 1
        except (ValidationError, ValueError):
            if i == 0:
                log_usage("groq", model, stage, note="escalated:invalid", cached=True)
            continue
    return last, settings.llm_large_model, True
