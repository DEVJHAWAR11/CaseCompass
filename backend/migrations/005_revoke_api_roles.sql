-- Second lock on the door: RLS (migration 004) already blocks Supabase's REST API for anon and
-- authenticated users; this also removes their table privileges and any future defaults, so a
-- table added later is not exposed by accident. Our backend connects as the database owner.
-- Guarded so it also runs on a plain Postgres (docker-compose) that has no such roles.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    alter default privileges in schema public revoke all on tables from anon;
    alter default privileges in schema public revoke all on sequences from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    alter default privileges in schema public revoke all on tables from authenticated;
    alter default privileges in schema public revoke all on sequences from authenticated;
  end if;
end $$;
