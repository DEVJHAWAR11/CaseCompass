# CaseCompass

Consumer court case finder for India. User describes a dispute in plain words; app finds similar past NCDRC/state commission cases, shows outcomes (who won, refund, compensation, law cited) with source links. First category: airline/travel refunds (~300-500 cases); design for more categories later. Portfolio project for advanced RAG: retrieval pipeline and eval numbers matter more than UI polish.

Status and next steps live in `PROGRESS.md`. Detail lives in `docs/` (read only when needed).

## Hard product rules
- Never say "you will win". Only show what similar cases decided, with citations.
- Always show: "This is information, not legal advice. Outcomes are AI-generated from public records and may contain errors."
- Counts/stats ("7 of 10 ordered a refund") are computed in code from extracted fields. LLM only phrases them, citing a source case for every claim.
- Outcome summaries are labeled AI-generated.

## Indian Kanoon (IK) terms the code must respect
- Read api.indiankanoon.org docs before coding; don't guess the API shape. Auth = public/private key request signing.
- Private key: backend env only. Never frontend, never committed.
- Show the "powered by IKanoon" logo unaltered (no resize/edit/cover) above any results showing their content; mention source in About. Never imply IKanoon endorsement.
- Prepaid per request: search 0.50 INR, doc 0.20, fragment 0.05, metainfo 0.02. 500 INR free. Cache every response on disk, never refetch.
- App must not hard-depend on live IK calls (balance 0 = empty responses). Friendly errors, never crash.
- Full-text storage is NOT confirmed allowed. Store only case IDs, our extracted fields, chunk embeddings, citation links. Fetch full text live on case open, cached. Keep storage behind `CaseTextStore` so it can switch.
- Data is "as is", no accuracy warranty: show disclaimer.

## Stack
- Backend: Python, FastAPI, Pydantic, async httpx. Tests pytest, lint ruff.
- DB: Supabase Postgres + pgvector + tsvector. Citation graph = plain tables (cases, citations) + networkx. No graph DB.
- LLM: Groq via openai SDK (base_url https://api.groq.com/openai/v1, env GROQ_API_KEY) behind a small `LLMProvider` interface. Cascade: cheap model first, escalate only on validation failure or "unclear"; log escalation rate. JSON output validated by Pydantic; "unclear" instead of guessing.
- Embeddings/rerank: Jina API (JINA_API_KEY) behind `Embedder` / `Reranker` interfaces (incl. pass-through NoRerank). Same model for corpus and queries with correct query/passage task types. Model name + dim stored in DB and config. Corpus embedded offline by local script; runtime embeds only the query.
- Frontend: Next.js App Router + TS + Tailwind on Vercel. Backend on Render/Fly free tier (sleeps: UI shows "waking up").
- Windows dev: scripts are Python (no bash-only). Docker/docker-compose for local dev.

## Pipeline (core)
1 rewrite story -> <=3 legal queries (one LLM call; HyDE optional) 2 hybrid dense+tsvector with RRF 3 Jina rerank top 20-30 4 structural chunking (facts/issues/reasoning/order) with context line prefix 5 citation graph expansion 6 offline outcome extraction (allowed/partly_allowed/dismissed/unclear, amounts, sections, 1-line summary) 7 answer from computed stats + top 5 chunks (~300 tok each).
Eval (`eval/`): ~30 stories, recall@5 etc per stage plus ablations (late chunking, rerank). Report honestly if a technique doesn't help.

## Cost and safety controls
- Per-IP rate limit on search; hard cap on LLM calls per request; daily token budget with hard stop; log every call (tokens in/out, est. cost, stage) in the usage ledger.
- Jina: 10M free token pool shared by embed+rerank; ~100 req and 100K tok per min. Track running total, warn at 70%, hard-stop at 90%. Cache query embeddings. On exhaustion/outage fall back to keyword-only with a small notice.
- Groq free tier: backoff, throttle, resumable jobs.
- Before ANY batch run (ingest, embed, extract, eval) print estimated calls/tokens/cost and wait for user OK. Small tests are fine.
- Secrets only in `.env` (gitignored); `.env.example` committed. Never commit keys, caches, data dumps.

## Token discipline (app)
Code before LLM (regex for dates, amounts, courts, section numbers; stats in code). Never send a full judgment: trim to facts/issues/order, cap ~4,000 tokens, log truncation rate. Filter by title/metainfo and dedupe before extraction. Cache LLM responses by hash(model, prompt, input). Stable prefix prompts, one short example max. Tiny JSON outputs, tight max_tokens (~150 rewrite, ~300 extraction). Exact lookups (case/section no., party) skip the LLM -> keyword search.

## How Claude works in this repo
- Keep this file <100 lines. Maintain `PROGRESS.md` (phase, decisions, next steps).
- Never open data dumps, fetched judgment text, cache dirs, lock files, build output. Inspect fetched data via counts or first few hundred chars.
- Quiet flags, head/tail, run only relevant tests. Targeted edits, not whole-file rewrites. Don't paste code that's visible in the diff.
- No sub-agents or broad repo-wide exploration unless asked.
- Ask the user on material decisions (models, schema, vector size) or anything unclear. Say what's needed (keys, accounts, inputs) before each phase. Be honest about gaps and weak results.
- Comment code well; explain concepts plainly first, technically second.
- End of each phase: ~10-line plain summary (what/why, what to test, usage/cost summary). Wait for go-ahead before next phase.

## Git
Commit after each meaningful chunk (~20-30 min). One-line plain-human messages ("added the Indian Kanoon client with response caching"). No prefixes (feat:/fix:), no emojis, no bodies, no AI/Claude mention. Don't push until the user says so.
