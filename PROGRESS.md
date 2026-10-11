# Progress

## Current phase
Step 0 done (scaffold). Waiting for go-ahead on Phase 1.

## Phases
1. IK client + disk cache + ~20 test cases, data sufficiency report: not started
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

## Usage/cost so far
None.
