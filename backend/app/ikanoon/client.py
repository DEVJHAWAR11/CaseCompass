"""Indian Kanoon API client.

Concept: every call costs real money (prepaid), so each response is saved to disk the first
time and reused forever after. A spend ledger also stops us before we burn the balance.
Auth: `Authorization: Token <token>` (the docs also allow public/private key signing).
"""
import hashlib
import json
from pathlib import Path

import httpx

from app.config import settings

# INR per request, from IK pricing. Search/doc are per page returned.
COST = {"search": 0.50, "doc": 0.20, "docfragment": 0.05, "docmeta": 0.02}


class IKError(Exception):
    """Friendly, user-showable failure (API down, balance empty, budget cap)."""


class IKClient:
    def __init__(self, cache_dir: Path | None = None, spend_cap: float | None = None):
        self.cache_dir = (cache_dir or settings.cache_path) / "ik"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.spend_cap = settings.ik_spend_cap_inr if spend_cap is None else spend_cap
        self.ledger = self.cache_dir / "_spend.json"
        self.live_calls = 0  # calls that actually hit the network this session
        self._http = httpx.AsyncClient(
            base_url=settings.ik_base_url,
            headers={"Authorization": f"Token {settings.ik_api_token}"},
            timeout=30,
        )

    async def aclose(self):
        await self._http.aclose()

    # ---- cache + spend helpers -------------------------------------------------
    def _path(self, kind: str, path: str, params: dict) -> Path:
        key = hashlib.sha256(json.dumps([path, params], sort_keys=True).encode()).hexdigest()[:24]
        return self.cache_dir / kind / f"{key}.json"

    def spent(self) -> float:
        return json.loads(self.ledger.read_text())["inr"] if self.ledger.exists() else 0.0

    def _add_spend(self, amount: float):
        self.ledger.write_text(json.dumps({"inr": round(self.spent() + amount, 2)}))

    async def _call(self, kind: str, path: str, params: dict | None = None) -> dict:
        params = params or {}
        cp = self._path(kind, path, params)
        if cp.exists():  # cache hit: free
            return json.loads(cp.read_text(encoding="utf-8"))
        if self.spent() + COST[kind] > self.spend_cap:
            raise IKError(f"IK spend cap {self.spend_cap} INR reached; not calling the API.")
        try:
            r = await self._http.post(path, params=params)
        except httpx.HTTPError as e:
            raise IKError("Indian Kanoon is unreachable right now.") from e
        if r.status_code in (402, 403):
            raise IKError("Indian Kanoon rejected the request (bad token or empty balance).")
        if r.status_code >= 400:
            raise IKError(f"Indian Kanoon returned HTTP {r.status_code}.")
        data = r.json()
        self.live_calls += 1
        self._add_spend(COST[kind])
        cp.parent.mkdir(parents=True, exist_ok=True)
        cp.write_text(json.dumps(data), encoding="utf-8")
        return data

    # ---- API calls --------------------------------------------------------------
    async def search(self, query: str, page: int = 0, **filters) -> dict:
        """Search. filters: doctypes, fromdate/todate (DD-MM-YYYY), title, cite, author, bench."""
        return await self._call("search", "/search/", {"formInput": query, "pagenum": page, **filters})

    async def doc(self, tid: int, maxcites: int = 50, maxcitedby: int = 50) -> dict:
        """Full document plus citeList / citedbyList (our citation-graph source)."""
        return await self._call(
            "doc", f"/doc/{tid}/", {"maxcites": maxcites, "maxcitedby": maxcitedby}
        )

    async def fragment(self, tid: int, query: str) -> dict:
        return await self._call("docfragment", f"/docfragment/{tid}/", {"formInput": query})

    async def meta(self, tid: int) -> dict:
        return await self._call("docmeta", f"/docmeta/{tid}/")
