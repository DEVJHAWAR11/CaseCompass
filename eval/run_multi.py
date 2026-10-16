"""Multi-category check: does a plain-words story find cases from the right dispute type?

Why this is a separate, smaller eval: the main eval (run_eval.py) has hand-built labels for airline
disputes only. For the other categories we only know the dispute type the extraction step assigned
(AI-assigned, not human-checked), so we measure whether the top 5 results come from the expected type.
Weak evidence, reported as such.  Usage:  backend/.venv/Scripts/python eval/run_multi.py
"""
import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "eval"))
import psycopg
from app.config import settings
from app.embeddings.jina import JinaEmbedder
from app.llm.provider import GroqProvider
from app.llm.rewrite import rewrite_query
from app.retrieval.search import search


async def main():
    stories = json.loads((ROOT / "eval" / "stories_multi.json").read_text(encoding="utf-8"))
    conn = psycopg.connect(settings.database_url, autocommit=True)
    emb, llm = JinaEmbedder("eval"), GroqProvider()
    rows, per_cat = [], {}
    for s in stories:
        qs = await rewrite_query(llm, s["story"])
        res = await search(conn, emb, s["story"], mode="hybrid", top=5, late=True, queries=qs)
        cats = [conn.execute("select category from cases where tid=%s", (r["tid"],)).fetchone()[0] for r in res]
        right = sum(c == s["cat"] for c in cats)
        rows.append((s["cat"], s["story"][:70], right, len(cats), cats[0] == s["cat"] if cats else False))
        d = per_cat.setdefault(s["cat"], [0, 0, 0, 0])
        d[0] += right; d[1] += len(cats); d[2] += right > 0; d[3] += 1
    await emb.aclose()
    tot = [sum(d[i] for d in per_cat.values()) for i in range(4)]
    lines = ["Multi-category check (16 stories; category labels are AI-assigned, not human-checked).", "",
             (f"Overall: {tot[0]}/{tot[1]} top-5 results in the expected category = {tot[0]/max(tot[1],1):.0%}; "
              f"at least one right in {tot[2]}/{tot[3]} stories; top-1 right in {sum(r[4] for r in rows)}/{len(rows)}."), "",
             "| category | top-5 right | stories with a hit |", "|---|---|---|"]
    for c, d in per_cat.items():
        lines.append(f"| {c} | {d[0]}/{d[1]} | {d[2]}/{d[3]} |")
    lines += ["", "Per story:", ""] + [f"- [{c}] {st}... -> {r}/{n} right, top-1 {'yes' if t1 else 'no'}" for c, st, r, n, t1 in rows]
    (ROOT / "eval" / "results_multi.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines[:14]))


if __name__ == "__main__":
    asyncio.run(main())
