-- Core tables. The `chunks` table is added in migration 002 once the embedding model
-- (and so the vector size) is chosen in Phase 3.
create extension if not exists vector;

-- One row per court case. Holds metadata + our own extracted fields, NOT judgment text.
create table if not exists cases (
  tid            bigint primary key,           -- Indian Kanoon document id
  title          text not null,
  court          text,                         -- IK docsource, e.g. NCDRC / State Commission
  court_level    text,                         -- ncdrc | state | district | other (derived in code)
  decided_on     date,
  category       text,                         -- dispute type; 'airline_travel' for now
  status         text not null default 'candidate', -- candidate | ingested | skipped
  skip_reason    text,
  doc_chars      int,
  text_hash      text,                         -- dedupe duplicates before any LLM call
  num_cites      int default 0,
  num_citedby    int default 0,
  source_url     text generated always as ('https://indiankanoon.org/doc/' || tid || '/') stored,
  -- outcome extraction (filled in Phase 5)
  result         text check (result in ('allowed','partly_allowed','dismissed','unclear')),
  refund_inr     numeric,
  compensation_inr numeric,
  laws_cited     jsonb,
  summary        text,                         -- AI-generated, always labelled as such in UI
  extracted_by   text,
  extracted_at   timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists cases_status_idx on cases(status);
create index if not exists cases_hash_idx on cases(text_hash);

-- Citation graph as a plain edge table (traversed with networkx in Python).
create table if not exists citations (
  from_tid bigint not null,                    -- the citing case
  to_tid   bigint not null,                    -- the cited doc (may not be in `cases`)
  primary key (from_tid, to_tid)
);
create index if not exists citations_to_idx on citations(to_tid);

-- One row per external API call: powers cost summaries, Jina pool tracking, daily budgets.
create table if not exists usage_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  service     text not null,                   -- ik | groq | jina
  model       text,
  stage       text,                            -- rewrite | extract | embed | rerank | ...
  tokens_in   int default 0,
  tokens_out  int default 0,
  cost_inr    numeric default 0,
  cached      boolean default false,
  note        text
);
create index if not exists usage_service_at_idx on usage_log(service, at);

-- Resumable batch jobs: one row per (job, item) so a paused run continues, not restarts.
create table if not exists jobs (
  job        text not null,
  item       text not null,
  status     text not null default 'pending', -- pending | done | failed
  detail     text,
  updated_at timestamptz not null default now(),
  primary key (job, item)
);
