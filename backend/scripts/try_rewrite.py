"""Smoke test for query rewriting (2 small LLM calls)."""
import asyncio

from app.llm.provider import GroqProvider
from app.llm.rewrite import rewrite_query


async def main():
    g = GroqProvider()
    print(await rewrite_query(g, "airline cancelled my flight and refused the refund for 3 months"))
    print(await rewrite_query(g, "my travel agent took money for a tour package and vanished", hyde=True))

asyncio.run(main())
