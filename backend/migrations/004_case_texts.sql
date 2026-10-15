-- Cleaned judgment text per case, stored so search and passage display never need a live
-- Indian Kanoon call. The owner decided to store text (IK terms are silent on storage; an
-- email to IK is pending). Removable: `drop table case_texts` + STORE_TEXT=false.
create table if not exists case_texts (
  tid        bigint primary key references cases(tid) on delete cascade,
  text       text not null,
  chars      int not null,
  fetched_at timestamptz not null default now()
);

-- Supabase exposes public-schema tables through its REST API; with RLS off, anyone holding the
-- project's public (anon) key could read them. Turn RLS on with no policies so only our direct
-- database connection (which bypasses RLS) can read or write.
alter table cases       enable row level security;
alter table chunks      enable row level security;
alter table citations   enable row level security;
alter table usage_log   enable row level security;
alter table jobs        enable row level security;
alter table case_texts  enable row level security;
