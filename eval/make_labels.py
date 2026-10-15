"""Build eval/labels.json: which cases are relevant to each story.

Ground truth = a dispute type per case, decided by plain rules over the case's own title and
text (party names like travel agents / booking portals; counts of words like baggage, offload,
refund, cancel). A case is relevant to a story if it carries the dispute type the story was
written to describe (STORY_TYPE below). Why rules and not the LLM: an LLM tagger was tried
first (scripts/tag_cases.py) but put obvious denied-boarding and delay cases under "other",
so it was discarded. Limits: types are coarse (nothing about airline, amount or year), and
keyword rules can favour keyword-style search. Stories with fewer than 3 relevant cases are
dropped. Hand-edit labels.json for stricter judgments.
"""
import asyncio
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import psycopg  # noqa: E402

from app.config import settings  # noqa: E402
from app.ikanoon.client import IKClient  # noqa: E402
from app.textstore import IKTextStore  # noqa: E402

AGENT = re.compile(r"travel|tour|trip|yatra|ibibo|goibibo|cox|thomas cook|holiday|cleartrip|"
                   r"flight raja|paytm|expedia|irctc|catering", re.IGNORECASE)

STORY_TYPE = {
    1: "cancel_refund", 2: "cancel_refund", 3: "denied_boarding", 4: "baggage", 5: "delay",
    6: "agent_package", 7: "agent_package", 8: "agent_package", 9: "baggage",
    10: "cancel_refund", 11: "cancel_refund", 12: "cancel_refund", 13: "baggage",
    14: "agent_package", 15: "cancel_refund", 16: "agent_package", 17: None,
    18: "cancel_refund", 19: "cancel_refund", 20: "agent_package", 21: "agent_package",
    22: "cancel_refund", 23: "denied_boarding", 24: None, 25: "delay",
    26: "agent_package", 27: "baggage", 28: "cancel_refund", 29: "cancel_refund", 30: None,
}  # None = story has no single dispute type (e.g. seat upgrade): not scored


def dispute_types(title: str, text: str) -> list[str]:
    t = text[:7000].lower()

    def n(pat):
        return len(re.findall(pat, t))

    types = []
    if AGENT.search(title):
        types.append("agent_package")
    if n(r"offload|denied boarding|denial of boarding|overbook|denied to board|refused to board") >= 2:
        types.append("denied_boarding")
    if n(r"baggage|luggage|pilfer|cargo|parcel") >= 6:
        types.append("baggage")
    if n(r"(flight|aircraft|departure|arrival)[^.]{0,80}delay|delay[^.]{0,80}(hours|flight|departure)") >= 2:
        types.append("delay")
    if n(r"cancel") >= 4 and n(r"refund") >= 4:
        types.append("cancel_refund")
    return types or ["other"]


async def main():
    conn = psycopg.connect(settings.database_url, autocommit=True)
    ik = IKClient()
    store = IKTextStore(ik)
    tags = {}
    for tid, title in conn.execute("select tid,title from cases where status='ingested' "
                                   "and category='airline_travel'").fetchall():
        tags[tid] = dispute_types(title, await store.get_text(tid))
        conn.execute("update cases set dispute_types=%s where tid=%s", (json.dumps(tags[tid]), tid))
    await ik.aclose()
    labels = {}
    for sid, typ in STORY_TYPE.items():
        rel = [t for t, ty in tags.items() if typ and typ in ty]
        if len(rel) >= 3:
            labels[str(sid)] = rel
    (Path(__file__).parent / "labels.json").write_text(json.dumps(labels), encoding="utf-8")
    print("stories with labels:", len(labels), "| relevant per story:",
          {k: len(v) for k, v in labels.items()})
    print("tag counts:", {t: sum(1 for ty in tags.values() if t in ty) for t in
                          ["cancel_refund", "denied_boarding", "baggage", "delay", "agent_package",
                           "other"]}, "| cases:", len(tags))


asyncio.run(main())
