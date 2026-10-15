# Handoff: start a new session from here

Read this first, then `CLAUDE.md` (rules), `PROGRESS.md` (status), and `docs/guide-notes.md`
(every number and decision; the user wants a detailed final project guide from it).
Do not open `data/`, cache folders or lock files. Keys live only in `.env` (gitignored): never print them.

## What CaseCompass is
Indian consumer-court case finder (airline/travel disputes). A person describes a problem in plain
words; the app finds similar NCDRC/state commission cases, shows outcomes (AI-extracted) with
links to the judgments. Never says "you will win". Portfolio/learning project: retrieval pipeline
and honest eval matter more than polish. Windows machine; repo at `C:\Users\KIIT0001\Desktop\consumer_court`.

## Where everything is
- `backend/` FastAPI app (`app/api/main.py`), pipeline (`app/retrieval/`), IK client (`app/ikanoon/`),
  Jina embeddings/rerank (`app/embeddings`, `app/rerank`), Groq LLM + cascade (`app/llm/`),
  extraction (`app/extraction/`), citation graph (`app/graph/`), text store (`app/textstore.py`),
  scripts (`backend/scripts/`: ingest, embed_corpus, extract_outcomes, apply_rules, backfill_text, migrate),
  SQL migrations 001-004 (`backend/migrations/`), tests (`backend/tests/`, 8 pass).
- `frontend/` Next.js 16 + Tailwind 4 + GSAP + Lenis. `/` illustrated landing page, `/search` the tool, `/about`.
- `eval/` stories, labels, variants, `run_eval.py`, `results.md`.
- `docs/` `guide-notes.md`, `eval.md`, `ikanoon-email.md`, this file.
- Run backend (from `backend/`): `PYTHONPATH=. .venv/Scripts/python -m uvicorn app.api.main:app --port 8000`
  Run frontend (from `frontend/`): `npm run dev`. Open http://localhost:3000 (add `?motion=force` if the OS has reduced motion on).
- Python env: `backend/.venv` (uv). Tests: `.venv/Scripts/python -m pytest -q`. Lint: `ruff check`.

## State (all committed locally, nothing pushed)
Phases 1-8 done. Phase 9 (deployment + README) not started.
- Data: 152 ingested cases (139 airline/travel), 548 chunks (2 vectors each: standard + late chunking),
  851 citation edges, `case_texts` 152 rows (2.8 M chars). DB = Supabase Postgres (session pooler URL in `.env`).
- Models: embeddings `jina-embeddings-v3` (1024 dims); reranker `jina-reranker-v2-base-multilingual` (OFF by default);
  Groq `gpt-oss-20b` (small) / `gpt-oss-120b` (large). `.env` currently sets LLM_SMALL_MODEL=gpt-oss-120b and
  LLM_MIN_INTERVAL_S=3 (use 12 for long extraction jobs).
- Pipeline default ("full"): query rewrite (1 LLM call) + hybrid (vector + tsvector, RRF). No reranker, no IK calls during search.
  Passage drawer: GET /passage/{tid}?start&end served from `case_texts`.
- Eval (27 stories, coarse rule-based labels): hybrid+rewrite no rerank nDCG@10 0.70, MRR 0.93, hit@5 1.00;
  plain hybrid 0.68; rerank on derived text 0.59 (worse); graph expansion lowers nDCG (shown separately as related cases).
- Outcome labels: ~70% correct on my 50-case check before a rule fix; not re-measured. Amounts: refund on 17/139, compensation on 27/139.
- Spend so far: IK 48.0 INR (500 free; code cap `ik_spend_cap_inr` = 100); Jina ~1M of 10M tokens; Groq free tier.
- Lighthouse (local prod build): desktop 97-98; mobile 79-87 (target 90 not met; next fix = pre-cropped phone hero image).

## Decisions made by the user
- Store judgment text in DB despite IK terms being silent (user has emailed IK; reversible: `STORE_TEXT=false` + `drop table case_texts`).
- Keep "AI-generated" labels (IK terms + honesty); plan: make them small, lead cards with verbatim order sentences.
- Backend host: Render (not Fly). Frontend: Vercel. No pushing to git until the user says so.
- Commits: one plain human line, no prefixes, no AI mention.
- User wants a thorough final guide later: keep `docs/guide-notes.md` current.

## Pending / next steps (in order)
1. **Security hardening (was interrupted, NOT done):** RLS is already ON for all 6 tables (migration 004). Still to run:
   revoke `anon`/`authenticated` privileges on public tables; scan git history and working tree for leaked secrets
   (patterns: `gsk_`, `jina_`, the IK token, DB password); confirm `.env` and `data/` are untracked.
   The user pasted the DB password, IK token, Jina key and Groq key in chat: recommend rotating them.
2. **Coverage is too thin** (150 cases; per dispute type roughly: cancel/refund 16, denied boarding 15, baggage 26, delay 23,
   agent/package 45). Plan: raise `ik_spend_cap_inr` to ~200 and add targeted discovery queries (delay compensation, offloading,
   lost/damaged baggage, travel-agent refund, tour/visa, hotel/online portal, cruise, covid cancellations, wheelchair/minor, excess baggage,
   ticket not generated, air cargo); 3 pages each (~21 INR) + up to 300 doc fetches (~60 INR). Then: `backfill_text.py`, `embed_corpus.py`
   (~0.7M Jina tokens), `extract_outcomes.py` (Groq: 8K tokens/min, 200K/day per model; run in background with LLM_MIN_INTERVAL_S=12),
   `apply_rules.py`, `eval/make_labels.py`, re-run `eval/run_eval.py`. Show the batch estimate to the user first.
   Also ask IK about the Rs 10,000/month non-commercial credit (email draft in `docs/ikanoon-email.md`, user says already mailed).
3. **50-case accuracy review sheet** (order text next to the AI label) so a real accuracy figure can be published.
4. Frontend: lead cards with the verbatim operative order sentence, shrink the AI label (keep it), pre-cropped mobile hero image.
5. **Phase 9:** needs from user: official "Powered by IKanoon" logo at `frontend/public/ikanoon-logo.png`, Vercel + Render accounts.
   README with architecture diagram, eval table, attribution. Backend free tier sleeps (UI already shows "waking up").
6. Final project guide (user request): use `docs/guide-notes.md`, `eval/results.md`, `docs/eval.md`.

## Gotchas learned
- Groq free tier limits are per model: 8,000 tokens/min AND 200,000 tokens/day. Throttle by tokens/min, not requests/min. qwen needs `reasoning_effort="none"` (already handled).
- In bash tool commands, heredocs containing apostrophes/quotes sometimes break: write files with the Write tool instead.
- On Windows kill background processes with PowerShell (`Get-CimInstance Win32_Process ... Stop-Process`); `pkill` does not exist.
- Print UTF-8 with `PYTHONIOENCODING=utf-8`. `git` warns about CRLF: harmless.
- e-Jagriti (official portal) has a CAPTCHA and only party-name search: do not scrape it. Open datasets (AWS Supreme/High Court, CC-BY-4.0) are the wrong court level.
- IK pricing: search 0.50, document 0.20, original 0.50, fragment 0.05, metainfo 0.02. Terms silent on storage; attribution logo unaltered is mandatory.
