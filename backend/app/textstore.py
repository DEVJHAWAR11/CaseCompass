"""CaseTextStore: where judgment text comes from at runtime.

DBTextStore (default): reads cleaned text from our own `case_texts` table, so search results,
passages and case pages make no Indian Kanoon calls. On a miss it falls back to a live IK fetch
(disk-cached) and, when STORE_TEXT is on, saves the text so the next read is free.
IKTextStore: live fetch only (the earlier no-storage behaviour); kept for switching back.
"""
from typing import Protocol

import psycopg

from app.chunking.chunker import clean_text
from app.config import settings
from app.ikanoon.client import IKClient


class CaseTextStore(Protocol):
    async def get_text(self, tid: int) -> str: ...


class IKTextStore:
    def __init__(self, ik: IKClient):
        self.ik = ik

    async def get_text(self, tid: int) -> str:
        return clean_text((await self.ik.doc(tid)).get("doc", ""))


class DBTextStore:
    def __init__(self, ik: IKClient):
        self.live = IKTextStore(ik)

    def _read(self, tid: int) -> str | None:
        with psycopg.connect(settings.database_url, autocommit=True) as c:
            row = c.execute("select text from case_texts where tid=%s", (tid,)).fetchone()
        return row[0] if row else None

    def _write(self, tid: int, text: str) -> None:
        with psycopg.connect(settings.database_url, autocommit=True) as c:
            c.execute("insert into case_texts(tid,text,chars) values(%s,%s,%s) "
                      "on conflict(tid) do nothing", (tid, text, len(text)))

    async def get_text(self, tid: int) -> str:
        text = self._read(tid)
        if text is not None:
            return text
        text = await self.live.get_text(tid)  # may raise IKError: callers already handle it
        if settings.store_text:
            self._write(tid, text)
        return text


def make_text_store(ik: IKClient) -> CaseTextStore:
    return DBTextStore(ik) if settings.store_text else IKTextStore(ik)
