# Progress

## Current phase
Phases 1-2 done. Awaiting go-ahead for Phase 3 (needs Jina key + model choice).

## Phases
1. IK client + disk cache + ~20 test cases, data sufficiency report: DONE (see below)
2. Schema + ingestion: DONE (152 cases ingested; `chunks` table deferred to Phase 3 until vector size is chosen)
3. Chunking + Jina embeddings + hybrid search: not started
4. Rerank + query rewriting: not started
5. Extraction (cascade) + citation graph: not started
6. Eval set + script + results: not started
7. FastAPI endpoints, rate limit, usage logging: not started
8. Next.js UI: not started
9. Deployment + README: not started

## Decisions
- Store no judgment text until IKanoon confirms; storage behind `CaseTextStore`.
- Jina model/dim and Groq models: pending proposals (Phase 3 / Phase 5 gates).

## Open items for the user
- Indian Kanoon account + API keys (Phase 1)
- Supabase project + DATABASE_URL (Phase 2)
- Jina key (Phase 3), Groq key (Phase 5)
- Has IKanoon been asked about full-text storage?

## Phase 1 findings
- Auth: `Authorization: Token <IK_API_TOKEN>` works (token in gitignored .env). Endpoints used with POST.
- Search returns 10 docs/page; hit counts: airline refund 326, air ticket refund 907, flight cancellation compensation 374, travel agent/tour refund 120 (unfiltered, includes non-consumer noise).
- Of 37 unique results from 4 page-0 searches: 24 State Commission, 6 NCDRC, 3 Supreme Court, 4 other. Consumer commission cases dominate, so ~300-500 is likely reachable but needs a `doctypes` filter and title-based pre-filtering.
- Doc response keys: cites/citedby (lists), numcites, numcitedby, publishdate, docsource, doc (HTML, ~19-61K chars). Citation-graph data comes free with doc fetch.

## Phase 2 findings
- DB: Supabase session pooler (IPv4) via DATABASE_URL in .env. Tables: cases, citations, usage_log, jobs.
- 152 ingested (29 NCDRC, 121 state, 2 supreme), 47 skipped (34 non-consumer-commission, 11 off-topic, 2 dup). 851 citation edges. Avg doc 19.7K chars, max 81K. All have dates.
- Some noise remains (e.g. card/timeshare disputes); Phase 5 extraction should tag category and drop non-travel.
- doctypes=consumer works. IK spend cap in config lowered to 100 INR; budget reserved for live case opens.
- Only 152 cases: more needs another batch (about 0.2 INR/doc plus searches) after reviewing.

## Usage/cost so far
IK: ~166 live calls, 47.4 INR of 500 spent. No LLM/Jina usage.
