-- Dispute-type tags per case (used as independent relevance ground truth for the eval,
-- and later for filtering/grouping results).
alter table cases add column if not exists dispute_types jsonb;
