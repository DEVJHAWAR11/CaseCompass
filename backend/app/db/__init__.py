"""Database connections with a small retry.

Supabase's pooler occasionally drops a connection ("SSL connection has been closed
unexpectedly"; it crashed an eval run once). A new connection is opened per request, so a
retry on connect is enough: two quick extra tries before giving up with the real error.
"""
import time

import psycopg

from app.config import settings

ATTEMPTS = 3
BACKOFF_S = 0.4


def connect() -> psycopg.Connection:
    """Autocommit connection to the app database; retries transient connect failures."""
    for attempt in range(1, ATTEMPTS + 1):
        try:
            return psycopg.connect(settings.database_url, autocommit=True, connect_timeout=10)
        except psycopg.OperationalError:
            if attempt == ATTEMPTS:
                raise
            time.sleep(BACKOFF_S * attempt)
    raise RuntimeError("unreachable")  # pragma: no cover
