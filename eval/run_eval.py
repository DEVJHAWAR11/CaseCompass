"""Run every pipeline variant over the eval stories and write a README-ready table.

Usage:  backend/.venv/Scripts/python eval/run_eval.py [--pool]
  --pool   print/save the union of every variant's top results per story (used to hand-label).
Metrics (per story, then averaged):
  recall@10  fraction of the story's relevant cases found in the top 10
  hit@5      1 if at least one relevant case is in the top 5 ("did we show something useful")
  P@5        precision of the top 5
  MRR        1/rank of the first relevant case
  nDCG@10    rank-aware gain, rewards putting relevant cases first
Labels live in eval/labels.json: {"<story id>": [relevant case ids]}.
"""
import argparse
import asyncio
import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from variants import ABLATIONS, STAGES, Env

HERE = Path(__file__).parent


def metrics(ranked, rel):
    rel = set(rel)
    hits = [1 if t in rel else 0 for t in ranked[:10]]
    rr = next((1 / (i + 1) for i, h in enumerate(hits) if h), 0.0)
    dcg = sum(h / math.log2(i + 2) for i, h in enumerate(hits))
    idcg = sum(1 / math.log2(i + 2) for i in range(min(len(rel), 10)))
    return {"recall@10": sum(hits) / len(rel), "hit@5": float(any(hits[:5])),
            "P@5": sum(hits[:5]) / 5, "MRR": rr, "nDCG@10": dcg / idcg if idcg else 0.0}


async def main(pool: bool):
    stories = json.loads((HERE / "stories.json").read_text(encoding="utf-8"))
    env = Env()
    try:
        runs = {}  # label -> {story id: ranked tids}
        for label, fn in STAGES + ABLATIONS:
            if label not in runs:
                runs[label] = {s["id"]: await fn(env, s["story"]) for s in stories}
                print("done:", label, flush=True)
        (HERE / "runs.json").write_text(json.dumps(runs), encoding="utf-8")
        if pool:
            titles = dict(env.conn.execute("select tid, title from cases").fetchall())
            summ = dict(env.conn.execute("select tid, summary from cases").fetchall())
            out = []
            for s in stories:
                tids = []
                for label in runs:
                    for t in runs[label][s["id"]]:
                        if t not in tids:
                            tids.append(t)
                out.append(f"## {s['id']}: {s['story']}")
                out += [f"{t} | {titles[t][:55]} | {(summ[t] or '')[:150]}" for t in tids]
            (HERE.parent / "data" / "pool.txt").write_text("\n".join(out), encoding="utf-8")
            print("pool written to data/pool.txt")
            return
        labels = json.loads((HERE / "labels.json").read_text(encoding="utf-8"))
        keys = ["recall@10", "hit@5", "P@5", "MRR", "nDCG@10"]

        def table(rows):
            lines = ["| Pipeline | " + " | ".join(keys) + " |", "|---|" + "---|" * len(keys)]
            for label, _ in rows:
                ms = [metrics(runs[label][s["id"]], labels[str(s["id"])])
                      for s in stories if labels.get(str(s["id"]))]
                lines.append(f"| {label} | " + " | ".join(
                    f"{sum(m[k] for m in ms) / len(ms):.2f}" for k in keys) + " |")
            return "\n".join(lines)

        n = sum(1 for s in stories if labels.get(str(s["id"])))
        md = (f"Eval over {n} stories (relevance labels: see docs/eval.md).\n\n### Pipeline stages\n\n"
              f"{table(STAGES)}\n\n### Ablations\n\n{table(ABLATIONS)}\n")
        (HERE / "results.md").write_text(md, encoding="utf-8")
        print(md)
    finally:
        await env.aclose()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", action="store_true")
    asyncio.run(main(ap.parse_args().pool))
