"""Phase 1 probe: run a few topic searches, report counts, fetch ~20 docs. Prints counts only.

Usage (from backend/):  .venv/Scripts/python scripts/ik_probe.py [--docs 20]
Cost: 1 page per query (0.50 INR) + 0.20 INR per doc. Cached, so reruns are free.
"""
import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.ikanoon.client import IKClient, IKError  # noqa: E402

QUERIES = [
    "airline refund cancelled flight deficiency in service",
    "air ticket refund not paid consumer commission",
    "flight cancellation compensation consumer protection act",
    "travel agent tour package refund deficiency in service",
]


async def main(n_docs: int):
    ik = IKClient()
    seen = {}
    try:
        for q in QUERIES:
            res = await ik.search(q)
            docs = res.get("docs", [])
            print(f"{q!r}: found={res.get('found')} page0={len(docs)}")
            for d in docs:
                seen.setdefault(d["tid"], d)
        srcs = {}
        for d in seen.values():
            srcs[d.get("docsource", "?")] = srcs.get(d.get("docsource", "?"), 0) + 1
        print("unique tids:", len(seen), "| by source:", srcs)
        for d in list(seen.values())[:3]:
            print("  sample:", d["tid"], d["title"][:80], "|", d.get("docsource"))
        got = 0
        for tid in list(seen)[:n_docs]:
            r = await ik.doc(tid)
            got += 1
            if got <= 2:
                print("  doc keys:", sorted(r), "| cites:", len(r.get("cites", [])),
                      "| citedby:", len(r.get("citedby", [])), "| chars:", len(r.get("doc", "")))
        print(f"fetched {got} docs | live calls this run: {ik.live_calls} | total spent INR: {ik.spent()}")
    except IKError as e:
        print("IK error:", e)
    finally:
        await ik.aclose()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--docs", type=int, default=20)
    asyncio.run(main(ap.parse_args().docs))
