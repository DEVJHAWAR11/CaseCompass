-- Chunks: embeddable passages of a case. We store OFFSETS into the (live-fetched) judgment
-- instead of the passage text, so the "why this result" drawer slices text it fetches on demand.
-- `tsv` holds stemmed keyword lexemes (needed for keyword search); no readable text is stored.
-- Vector size 1024 = jina-embeddings-v3 (model name + dim also stored per row).
create table if not exists chunks (
  id          bigserial primary key,
  tid         bigint not null references cases(tid) on delete cascade,
  section     text not null,               -- facts | issues | order
  idx         int not null,                -- position within the case
  char_start  int not null,
  char_end    int not null,
  tokens_est  int,
  embed_model text not null,
  embed_dim   int not null,
  emb         vector(1024),                -- standard chunk embedding
  emb_late    vector(1024),                -- late-chunking embedding (ablation)
  tsv         tsvector,
  unique (tid, idx)
);
create index if not exists chunks_tid_idx on chunks(tid);
create index if not exists chunks_tsv_idx on chunks using gin(tsv);
create index if not exists chunks_emb_idx on chunks using hnsw (emb vector_cosine_ops);
create index if not exists chunks_emb_late_idx on chunks using hnsw (emb_late vector_cosine_ops);
