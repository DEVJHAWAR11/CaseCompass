# Progress

## Current phase
Phase 1 built and probed (IK client + cache + probe script). Awaiting user review before Phase 2.

## Phases
1. IK client + disk cache + ~20 test cases, data sufficiency report: DONE (see below)
2. Schema + ingestion: not started
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

## Usage/cost so far
IK: 24 live calls, 6.00 INR of 500. No LLM/Jina usage.
