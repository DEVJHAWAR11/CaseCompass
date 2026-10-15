"""Phase 2 ingestion: discover candidate cases, then fetch + record them.

Concept: two cheap-to-expensive steps.
  1. discover  - IK search pages (0.50 INR each) -> candidate cases (title/source only).
                 Cheap code filters drop off-topic and non-consumer-court results BEFORE we
                 pay to fetch the full document.
  2. fetch     - IK doc call (0.20 INR each) -> metadata, citations, text hash for dedupe.
                 Judgment text is NOT stored (see CLAUDE.md); only fields we derive.
Resumable: case `status` in the DB is the checkpoint, and IK responses are disk-cached,
so a rerun never repeats paid work.

Usage (from backend/):
  python scripts/ingest.py --estimate                   # print calls + cost, then stop
  python scripts/ingest.py --run --max-docs 400         # actually do it (after user OK)
"""
import argparse
import asyncio
import hashlib
import re
import sys
from datetime import datetime
from pathlib import Path

import psycopg
from dotenv import dotenv_values

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import ROOT
from app.ikanoon.client import COST, IKClient, IKError

QUERIES = [
    "airline refund cancelled flight deficiency in service",
    "air ticket refund not paid",
    "flight cancellation compensation",
    "flight delay compensation passenger",
    "baggage lost airline deficiency in service",
    "denied boarding overbooking airline",
    "tour package refund deficiency in service",
    "online travel agent refund ticket cancellation",
]
PAGES_PER_QUERY = 5

# Second discovery round (--extra): narrower dispute types to thicken thin categories.
EXTRA_QUERIES = [
    "airline offloaded passenger valid ticket compensation",
    "lost damaged baggage airline compensation consumer",
    "travel agent failed to refund airline ticket",
    "tour operator package cancelled refund deficiency",
    "visa tour package not provided refund travel company",
    "hotel booking online portal refund deficiency in service",
    "cruise booking cancellation refund",
    "covid lockdown flight ticket refund credit shell",
    "wheelchair passenger airline deficiency in service",
    "excess baggage charges airline consumer complaint",
    "ticket not generated payment deducted online booking airline",
    "air cargo consignment damaged lost airline consumer",
]

# Cheap relevance signal: does the title/snippet look travel- or airline-related?
TOPIC = re.compile(
    r"airline|airways|air ?india|indigo|spicejet|vistara|jet ?airways|go ?air|air ?asia|flight|"
    r"air ticket|travel|tour|makemytrip|goibibo|yatra|cleartrip|thomas cook|holiday|cruise|"
    r"ticket|baggage|boarding|hotel|resort|visa|cargo|passenger|tourism", re.IGNORECASE)


def court_level(src: str) -> str | None:
    s = (src or "").lower()
    if "national consumer" in s:
        return "ncdrc"
    if "state consumer" in s:
        return "state"
    if "supreme court" in s:
        return "supreme"
    return None  # district courts, high courts, statutes: out of scope for now


def clean(t: str) -> str:
    return re.sub(r"<[^>]+>", "", t or "").strip()


def parse_date(s: str | None):
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d %B, %Y"):
        try:
            return datetime.strptime((s or "").strip(), fmt).date()
        except ValueError:
            pass
    return None


async def discover(ik: IKClient, conn, pages: int, queries=None):
    new = skipped = 0
    for q in queries or QUERIES:
        for p in range(pages):
            res = await ik.search(q, page=p, doctypes="consumer")
            for d in res.get("docs", []):
                title, lvl = clean(d["title"]), court_level(d.get("docsource"))
                reason = None
                if lvl is None:
                    reason = "not_consumer_commission"
                elif not TOPIC.search(title + " " + clean(d.get("headline", ""))):
                    reason = "off_topic"
                cur = conn.execute(
                    """insert into cases(tid,title,court,court_level,category,status,skip_reason)
                       values(%s,%s,%s,%s,'airline_travel',%s,%s) on conflict(tid) do nothing""",
                    (d["tid"], title, d.get("docsource"), lvl,
                     "skipped" if reason else "candidate", reason))
                new += cur.rowcount
                skipped += bool(reason) and cur.rowcount
    conn.commit()
    return new, skipped


async def fetch(ik: IKClient, conn, max_docs: int):
    rows = conn.execute(
        "select tid from cases where status='candidate' order by tid limit %s", (max_docs,)
    ).fetchall()
    done = dup = 0
    for (tid,) in rows:
        r = await ik.doc(tid)
        text = clean(r.get("doc", ""))
        h = hashlib.sha256(re.sub(r"\s+", " ", text).lower().encode()).hexdigest()
        if conn.execute("select 1 from cases where text_hash=%s and tid<>%s", (h, tid)).fetchone():
            conn.execute("update cases set status='skipped', skip_reason='duplicate' where tid=%s", (tid,))
            dup += 1
            continue
        cites = [c["tid"] for c in r.get("cites", []) if "tid" in c]
        citedby = [c["tid"] for c in r.get("citedby", []) if "tid" in c]
        conn.execute(
            """update cases set status='ingested', doc_chars=%s, text_hash=%s, decided_on=%s,
               num_cites=%s, num_citedby=%s where tid=%s""",
            (len(text), h, parse_date(r.get("publishdate")),
             r.get("numcites", len(cites)), r.get("numcitedby", len(citedby)), tid))
        edges = [(tid, c) for c in cites] + [(c, tid) for c in citedby]
        for e in edges:
            conn.execute("insert into citations values(%s,%s) on conflict do nothing", e)
        done += 1
        if done % 25 == 0:
            conn.commit()
            print(f"  ...{done} fetched, spent INR {ik.spent()}")
    conn.commit()
    return done, dup


async def main(a):
    queries = EXTRA_QUERIES if a.extra else QUERIES
    n_search = len(queries) * a.pages
    print(f"DISCOVERY: up to {n_search} search calls = {n_search * COST['search']:.2f} INR")
    print(f"FETCH:     up to {a.max_docs} doc calls  = {a.max_docs * COST['doc']:.2f} INR")
    print(f"TOTAL worst case: {n_search * COST['search'] + a.max_docs * COST['doc']:.2f} INR "
          "(cached calls are free; no LLM/Jina used)")
    if not a.run:
        return
    url = dotenv_values(ROOT / ".env")["DATABASE_URL"]
    ik = IKClient()
    try:
        with psycopg.connect(url) as conn:
            print("discover (new, skipped):", await discover(ik, conn, a.pages, queries))
            print("fetch (ingested, duplicates):", await fetch(ik, conn, a.max_docs))
            print(conn.execute("select status, count(*) from cases group by 1 order by 1").fetchall())
    except IKError as e:
        print("stopped:", e, "- rerun to resume")
    finally:
        await ik.aclose()
        print("live IK calls:", ik.live_calls, "| total spent INR:", ik.spent())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--estimate", action="store_true")
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--extra", action="store_true", help="use EXTRA_QUERIES")
    ap.add_argument("--pages", type=int, default=PAGES_PER_QUERY)
    ap.add_argument("--max-docs", type=int, default=400)
    asyncio.run(main(ap.parse_args()))
