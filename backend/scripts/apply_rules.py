"""Apply the code-side outcome rules to extracted cases and report how many changed."""
import asyncio
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings  # noqa: E402
from app.extraction.extract import rule_override  # noqa: E402
from app.ikanoon.client import IKClient  # noqa: E402
from app.textstore import IKTextStore  # noqa: E402


async def main():
    conn = psycopg.connect(settings.database_url, autocommit=True)
    ik = IKClient()
    store = IKTextStore(ik)
    changed = {}
    for tid, old in conn.execute(
            "select tid, result from cases where extracted_at is not null").fetchall():
        new = rule_override(await store.get_text(tid))
        if new and new != old:
            conn.execute("update cases set result=%s where tid=%s", (new, tid))
            changed[(old, new)] = changed.get((old, new), 0) + 1
    print("changed:", changed)
    print(conn.execute("select result,count(*) from cases where extracted_at is not null "
                       "group by 1 order by 1").fetchall())
    await ik.aclose()

asyncio.run(main())
