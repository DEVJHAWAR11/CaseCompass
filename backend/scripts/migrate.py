"""Apply SQL files in backend/migrations in order (idempotent: they use IF NOT EXISTS)."""
from pathlib import Path

import psycopg
from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]
url = dotenv_values(BACKEND.parent / ".env")["DATABASE_URL"]

with psycopg.connect(url, autocommit=True) as conn:
    for f in sorted((BACKEND / "migrations").glob("*.sql")):
        conn.execute(f.read_text(encoding="utf-8"))
        print("applied", f.name)
    tables = conn.execute(
        "select table_name from information_schema.tables where table_schema='public' order by 1"
    ).fetchall()
    print("tables:", [t[0] for t in tables])
