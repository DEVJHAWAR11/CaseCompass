"""CaseTextStore: where judgment text comes from at runtime.

Today: fetched from Indian Kanoon (disk-cached), never stored in our database.
To switch to storing text later, add another implementation of this interface.
"""
from typing import Protocol

from app.chunking.chunker import clean_text
from app.ikanoon.client import IKClient


class CaseTextStore(Protocol):
    async def get_text(self, tid: int) -> str: ...


class IKTextStore:
    def __init__(self, ik: IKClient):
        self.ik = ik

    async def get_text(self, tid: int) -> str:
        return clean_text((await self.ik.doc(tid)).get("doc", ""))
