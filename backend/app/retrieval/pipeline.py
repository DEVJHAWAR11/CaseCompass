"""End-to-end search used by the API: routing, fallbacks, enrichment, and computed stats.

Concepts:
- Exact lookups (case numbers, "section 14") skip the LLM and Jina entirely -> keyword search.
- Degrade, don't fail: if Jina is exhausted/unreachable we fall back to keyword-only search; if
  the LLM is down or over budget we skip query rewriting. Each fallback adds a user-visible notice.
- Every number shown to the user (counts, medians) is computed here in code from extracted fields.
"""
import re
import statistics
from dataclasses import dataclass

import psycopg

from app.config import settings
from app.embeddings.jina import JinaEmbedder
from app.extraction.extract import operative_order
from app.graph.citation_graph import expand
from app.ikanoon.client import IKClient, IKError
from app.llm.provider import GroqProvider
from app.llm.rewrite import rewrite_query
from app.rerank.rerank import JinaReranker
from app.retrieval.search import search
from app.textstore import IKTextStore
from app.usage.ledger import JinaPoolExhausted

# Case-number-ish or statute-section-ish input: "FA/463/2018", "RP 1234 of 2019", "section 14".
_EXACT = re.compile(r"\b(?:fa|rp|cc|oa|ca)\s*[/.\-]?\s*\d{2,5}\s*(?:/|of)\s*\d{2,4}\b|"
                    r"\bsection\s+\d+[a-z]?\b|\bu/s\s*\d+", re.IGNORECASE)


def is_exact_lookup(q: str) -> bool:
    return bool(_EXACT.search(q))


@dataclass
class Services:
    """Long-lived clients shared across requests (caches live inside them)."""
    emb: JinaEmbedder
    rr: JinaReranker
    llm: GroqProvider
    ik: IKClient
    store: IKTextStore
    graph: object  # networkx.DiGraph
    corpus: set


def compute_stats(cases: list[dict]) -> dict:
    """Counts and medians from extracted fields. Never touched by an LLM."""
    n = len(cases)
    by = {k: sum(1 for c in cases if c["result"] == k)
          for k in ("allowed", "partly_allowed", "dismissed", "unclear")}
    comps = [c["compensation_inr"] for c in cases if c["compensation_inr"]]
    refunds = [c["refund_inr"] for c in cases if c["refund_inr"]]
    return {"total": n, **by, "favoured_complainant": by["allowed"] + by["partly_allowed"],
            "median_compensation_inr": statistics.median(comps) if comps else None,
            "median_refund_inr": statistics.median(refunds) if refunds else None,
            "with_compensation": len(comps), "with_refund": len(refunds)}


def summary_line(stats: dict) -> str:
    """Plain template sentence (no LLM, so it cannot invent anything)."""
    n, fav = stats["total"], stats["favoured_complainant"]
    if n == 0:
        return "No similar cases found."
    s = (f"In {fav} of {n} similar cases, the commission ruled fully or partly in favour of the "
         f"complainant; {stats['dismissed']} were dismissed and {stats['unclear']} had an unclear outcome.")
    if stats["median_compensation_inr"]:
        s += (f" Where an amount was extracted ({stats['with_compensation']} cases), the median "
              f"compensation was Rs {int(stats['median_compensation_inr']):,}.")
    return s


# AI summaries that only say the model could not read the outcome are noise on a card, so they
# are dropped at serve time (the case still shows its result label and the judgment link).
_WEAK_SUMMARY = re.compile(
    r"provides? no|does not (?:state|specify|mention|provide|contain|include)|"
    r"no (?:details|information|mention)|not (?:stated|specified|provided|clear)|"
    r"\bexcerpt\b|cannot (?:be )?determin|insufficient", re.IGNORECASE)


def usable_summary(summary: str | None) -> str | None:
    """The stored one-line summary, or None when it is empty or only says details are missing."""
    if not summary or _WEAK_SUMMARY.search(summary):
        return None
    return summary


def _enrich(conn: psycopg.Connection, hits: list[dict]) -> list[dict]:
    tids = [h["tid"] for h in hits]
    rows = {r[0]: r for r in conn.execute(
        """select tid,title,court,decided_on,result,refund_inr,compensation_inr,laws_cited,
                  summary,source_url,num_citedby from cases where tid = any(%s)""", (tids,))}
    # Last ~2500 characters of each judgment, to quote the operative order verbatim (no model).
    tails = {t: x for t, x in conn.execute(
        "select tid, right(text, 2500) from case_texts where tid = any(%s)", (tids,))}
    out = []
    for h in hits:
        r = rows[h["tid"]]
        out.append({
            "tid": r[0], "title": r[1], "court": r[2], "decided_on": str(r[3]) if r[3] else None,
            "result": r[4] or "unclear",
            "refund_inr": float(r[5]) if r[5] is not None else None,
            "compensation_inr": float(r[6]) if r[6] is not None else None,
            "laws_cited": r[7] or [], "summary_ai": usable_summary(r[8]),
            "order_excerpt": operative_order(tails.get(r[0], "")), "source_url": r[9],
            "cited_by_count": r[10], "matched_section": h["section"],
            "match_start": h.get("start"), "match_end": h.get("end"),
            "score": h.get("score")})
    return out


async def run_search(sv: Services, conn: psycopg.Connection, story: str, mode: str = "full",
                     top: int = 10) -> dict:
    notices: list[str] = []
    effective = {"naive": "naive", "hybrid": "hybrid",
                 "full": "rerank" if settings.rerank_enabled else "hybrid"}[mode]
    queries: list[str] = []
    if is_exact_lookup(story):
        effective = "keyword"
        notices.append("Looks like a case or section number, so we used exact keyword search.")
    elif mode == "full":
        queries = await rewrite_query(sv.llm, story)
        if not queries:
            notices.append("Query rewriting was unavailable; searched with your original words.")
    try:
        hits = await search(conn, sv.emb, story, mode=effective, top=top, reranker=sv.rr,
                            store=sv.store, queries=queries, late=settings.use_late_chunking)
    except (JinaPoolExhausted, RuntimeError, IKError) as e:
        # Embedding/rerank service unavailable: keyword-only fallback, with a notice.
        notices.append("Smart search is temporarily unavailable, so this result uses basic "
                       "keyword search only.")
        hits = await search(conn, sv.emb, story, mode="keyword", top=top)
        effective = "keyword"
        _ = e
    cases = _enrich(conn, hits) if hits else []
    # No Indian Kanoon calls during search: ranking and reranking use only our own stored fields.
    # The matched passage is fetched later, on demand, by GET /passage/{tid} (one call per click).
    related = []
    if cases:
        rel_ids = expand(sv.graph, [c["tid"] for c in cases[:3]], sv.corpus, k=5)
        shown = {c["tid"] for c in cases}
        rel_ids = [t for t in rel_ids if t not in shown][:3]
        if rel_ids:
            related = _enrich(conn, [{"tid": t, "section": "related"} for t in rel_ids])
    stats = compute_stats(cases)
    return {"mode_used": effective, "rewritten_queries": queries, "cases": cases,
            "related_cases": related, "stats": stats, "summary": summary_line(stats),
            "notices": notices}
