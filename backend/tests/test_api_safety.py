"""Rate limiting, client IP trust and the no-bulk-text rule for the public API."""
from collections import defaultdict, deque
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api import main
from app.config import settings


def _request(xff: str | None = None, host="10.0.0.9", cf: str | None = None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    if cf:
        headers.append((b"cf-connecting-ip", cf.encode()))
    scope = {"type": "http", "headers": headers, "client": (host, 1234), "method": "GET",
             "path": "/", "query_string": b"", "app": SimpleNamespace(state=SimpleNamespace(
                 hits=defaultdict(deque)))}
    return Request(scope)


def test_client_ip_uses_entry_added_by_our_proxy_not_the_faked_left_one():
    assert main.client_ip(_request("6.6.6.6, 203.0.113.7")) == "203.0.113.7"  # hops=1: rightmost
    assert main.client_ip(_request(None)) == "10.0.0.9"  # no header: socket peer


def test_cloudflare_header_wins_over_forwarded_for():
    # Render's real chain: "<faked>,<client>, <cloudflare>, <internal>"; CF-Connecting-IP is the client
    r = _request("1.2.3.4,104.28.210.144, 104.23.160.149, 10.24.213.5", cf="104.28.210.144")
    assert main.client_ip(r) == "104.28.210.144"


def test_per_ip_limit_blocks_after_n_requests(monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_per_min", 3)
    req = _request("203.0.113.7")
    for _ in range(3):
        main.check_rate_limit(req)
    with pytest.raises(HTTPException) as e:
        main.check_rate_limit(req)
    assert e.value.status_code == 429


def test_rotating_fake_ips_still_hit_the_global_cap(monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_per_min", 100)
    monkeypatch.setattr(settings, "global_rate_limit_per_min", 5)
    state = defaultdict(deque)
    for i in range(5):
        r = _request(f"1.1.1.1, 9.9.9.{i}")
        r.scope["app"].state.hits = state
        main.check_rate_limit(r)
    r = _request("1.1.1.1, 9.9.9.99")
    r.scope["app"].state.hits = state
    with pytest.raises(HTTPException):
        main.check_rate_limit(r)


def test_case_endpoint_never_returns_judgment_text():
    import inspect
    src = inspect.getsource(main.case_endpoint)
    assert '"text"' not in src and "get_text" not in src
