"""Retrieval pipeline stages.

Concepts:
- Dense search: compare the meaning-vector of the query to chunk vectors (finds paraphrases).
- Keyword search: Postgres full-text (finds exact words/section numbers; blind to paraphrase).
- Hybrid: run both and merge with Reciprocal Rank Fusion (RRF): each list gives a chunk
  1/(k+rank) points, summed. No score calibration needed between the two systems.
- Rerank: a slower cross-encoder re-scores the top candidates against the query.
Results are collapsed to one entry per case (its best chunk) because users want cases.
"""
import psycopg

from app.config import settings
from app.embeddings.jina import Embedder
from app.rerank.rerank import NoRerank, Reranker
from app.textstore import CaseTextStore

RRF_K = 60


def _vec(v):
    return "[" + ",".join(f"{x:.6f}" for x in v) + "]"


def dense(conn: psycopg.Connection, qvec, n=30, late=False):
    col = "emb_late" if late else "emb"
    return conn.execute(
        f"select id from chunks where tid in (select tid from cases where status='ingested') "
        f"order by {col} <=> %s::vector limit %s", (_vec(qvec), n)
    ).fetchall()


def keyword(conn: psycopg.Connection, query: str, n=30):
    # websearch_to_tsquery ANDs words; use OR so a long plain story still matches something.
    words = " or ".join(w for w in query.replace('"', " ").split() if len(w) > 2)
    return conn.execute(
        """select id from chunks, websearch_to_tsquery('english', %s) q
           where tsv @@ q and tid in (select tid from cases where status='ingested')
           order by ts_rank_cd(tsv, q) desc limit %s""", (words, n)).fetchall()


def rrf(*ranked_lists, k=RRF_K):
    score: dict[int, float] = {}
    for lst in ranked_lists:
        for rank, (cid,) in enumerate(lst):
            score[cid] = score.get(cid, 0.0) + 1.0 / (k + rank + 1)
    return sorted(score, key=score.get, reverse=True)


def to_cases(conn, chunk_ids: list[int], top=10, category: str | None = "airline_travel"):
    """Collapse ordered chunk ids to ordered unique cases, remembering the best chunk each."""
    if not chunk_ids:
        return []
    rows = conn.execute(
        """select ch.id,ch.tid,ch.section,ch.char_start,ch.char_end from chunks ch
           join cases c on c.tid=ch.tid where ch.id = any(%s)
           and (%s::text is null or c.category = %s)""", (chunk_ids, category, category)
    ).fetchall()
    info = {r[0]: r for r in rows}
    seen, out = set(), []
    for cid in chunk_ids:
        if cid not in info:  # chunk belongs to a case outside the target category
            continue
        _, tid, sec, s, e = info[cid]
        if tid not in seen:
            seen.add(tid)
            out.append({"tid": tid, "chunk_id": cid, "section": sec, "start": s, "end": e})
        if len(out) >= top:
            break
    return out


def derived_text(conn: psycopg.Connection, tid: int, section: str) -> str:
    """Rerank input built ONLY from our own stored fields (no judgment text, no IK call):
    title, court, year, matched section, AI outcome + one-line summary, laws cited."""
    r = conn.execute("select title,court,decided_on,result,refund_inr,compensation_inr,summary,"
                     "laws_cited from cases where tid=%s", (tid,)).fetchone()
    title, court, on, result, refund, comp, summary, laws = r
    parts = [f"{title}. {court}, {on.year if on else 'n.d.'}.", f"Matched part: {section}.",
             f"Outcome: {(result or 'unclear').replace('_', ' ')}."]
    if refund:
        parts.append(f"Refund Rs {int(refund):,}.")
    if comp:
        parts.append(f"Compensation Rs {int(comp):,}.")
    if summary:
        parts.append(summary)
    if laws:
        parts.append("Law: " + "; ".join(laws[:3]) + ".")
    return " ".join(parts)


async def search(conn, embedder: Embedder, query: str, mode="hybrid", top=10, late=False,
                 reranker: Reranker | None = None, store: CaseTextStore | None = None,
                 queries: list[str] | None = None, candidates=30,
                 rerank_source: str = "derived"):
    """mode: 'naive' (dense only) | 'keyword' | 'hybrid' | 'rerank' (hybrid + reranker).
    `queries` = extra rewritten queries; each adds its own dense+keyword lists to the fusion.
    rerank_source: 'derived' (default; our own stored fields, zero Indian Kanoon calls) or
    'passage' (the matched judgment passage, fetched live through `store`; costs IK credit)."""
    qs = [query] + (queries or [])
    lists = []
    if mode != "keyword":
        vecs = await embedder.embed(qs, "retrieval.query")
        lists += [dense(conn, v, candidates, late) for v in vecs]
    if mode in ("keyword", "hybrid", "rerank"):
        lists += [keyword(conn, q, candidates) for q in qs]
    ids = rrf(*lists) if len(lists) > 1 else [c for (c,) in lists[0]]
    if mode == "rerank":
        cases = to_cases(conn, ids, top=20)  # rerank at most 20 cases
        texts = []
        for c in cases:
            if rerank_source == "passage":
                full = await store.get_text(c["tid"])
                texts.append(full[c["start"]:c["end"]][:1200])  # ~300 tokens each
            else:
                texts.append(derived_text(conn, c["tid"], c["section"]))
        scores = await (reranker or NoRerank()).rerank(query, texts)
        order = sorted(range(len(cases)), key=lambda i: scores[i], reverse=True)
        return [cases[i] | {"score": scores[i]} for i in order][:top]
    return to_cases(conn, ids, top=top)


__all__ = ["dense", "keyword", "rrf", "search", "settings", "to_cases"]
