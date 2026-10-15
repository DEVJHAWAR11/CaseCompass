"""Apply new SQL files in backend/migrations in order and record each in schema_migrations.

Files are still written idempotently (IF NOT EXISTS), so the first run against a database that
predates the tracking table simply re-applies 001-00N once and records them.
"""
from pathlib import Path

import psycopg
from dotenv import dotenv_values

BACKEND = Path(__file__).resolve().parents[1]
url = dotenv_values(BACKEND.parent / ".env")["DATABASE_URL"]

with psycopg.connect(url, autocommit=True) as conn:
    conn.execute("create table if not exists schema_migrations("
                 "name text primary key, applied_at timestamptz not null default now())")
    done = {r[0] for r in conn.execute("select name from schema_migrations").fetchall()}
    for f in sorted((BACKEND / "migrations").glob("*.sql")):
        if f.name in done:
            print("already applied", f.name)
            continue
        conn.execute(f.read_text(encoding="utf-8"))
        conn.execute("insert into schema_migrations(name) values (%s)", (f.name,))
        print("applied", f.name)
    # Supabase exposes public tables over REST: keep the new table locked like the others.
    conn.execute("alter table schema_migrations enable row level security")
    tables = conn.execute(
        "select table_name from information_schema.tables where table_schema='public' order by 1"
    ).fetchall()
    print("tables:", [t[0] for t in tables])
