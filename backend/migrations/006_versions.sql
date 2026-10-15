-- Reproducibility: remember which extraction logic produced each case's outcome fields, so a
-- change to the prompt or rules can be re-run on only the older rows.
alter table cases add column if not exists extraction_version text;
update cases set extraction_version = 'v1' where extracted_at is not null and extraction_version is null;
