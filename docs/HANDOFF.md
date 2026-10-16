# Handoff: start a new session from here (updated 2026-10-16)

Read this first, then `CLAUDE.md` (rules), `PROGRESS.md` (status), and `docs/guide-notes.md`
(every number and decision; the user wants a detailed final project guide built from it).
Do not open `data/`, cache folders or lock files. Keys live only in `.env` (gitignored): never print them.

## What CaseCompass is
Indian consumer-court case finder (airline/travel disputes). A person describes a problem in plain
words; the app finds similar NCDRC/state commission cases and shows how they were decided (AI-extracted
outcome, amounts, law cited) with the verbatim final-order sentence and a link to the judgment. It never
says "you will win". Portfolio project: retrieval quality and honest eval numbers matter more than polish.
Windows machine. Repo: `C:\Users\KIIT0001\Desktop\consumer_court`, GitHub `DEVJHAWAR11/CaseCompass`
(branch `main`, public, everything pushed). Commits: one plain human line, no prefixes, no AI mention.

## It is LIVE
- Backend (Render free, Docker): https://casecompass-qw3v.onrender.com  (`/health`, `/search`, `/passage/{tid}`, `/case/{tid}` metadata only, `/usage`). Service id `srv-db8ff5rl550s738vcs20`. Auto-deploys on push to main (~3-4 min).
- Frontend (Vercel Hobby, root dir `frontend`): https://case-compass-zeta.vercel.app (project `case-compass`, team `case-compass1`). NOT `case-compass.vercel.app` (someone else's).
- The user is signed in to Render, Vercel and GitHub in the built-in browser. Never create accounts, enter passwords, or type API keys/DB URLs into any form: the user does that. Render env vars: DATABASE_URL, GROQ_API_KEY, JINA_API_KEY, IK_API_TOKEN (user-entered) plus CORS_ORIGINS, IK_SPEND_CAP_INR=0, LLM_SMALL_MODEL=openai/gpt-oss-120b, LLM_MIN_INTERVAL_S=3. Render's env form needs real typing, not programmatic fill. See `docs/DEPLOY.md` for the gotchas.
- CI (`.github/workflows/ci.yml`): ruff + pytest (backend), eslint + next build (frontend). Green. 30 tests, 10 are DB/Jina integration tests that skip without DATABASE_URL.

## Where things are
- `backend/` FastAPI (`app/api/main.py`), pipeline `app/retrieval/` (search.py, pipeline.py), extraction `app/extraction/extract.py` (LLM extract + code rules: rule_override, op_appeal_dismissed, amounts_from_order, operative_order), `app/db/__init__.py` (connect with retry), text store `app/textstore.py`, scripts `backend/scripts/` (ingest, embed_corpus, extract_outcomes, apply_rules, dedupe_orders, make_review_sheet, migrate, backfill_text), migrations 001-006 tracked in `schema_migrations`.
- `frontend/` Next.js 16 + Tailwind 4 + GSAP + Lenis: `/` landing, `/search` tool, `/about`. `components/ResultCard.tsx` is the result card.
- `eval/` stories, labels, variants, `run_eval.py`, `results.md`, `score_review.py`, `review_results*.md`.
- Run backend (from `backend/`): `PYTHONPATH=. .venv/Scripts/python -m uvicorn app.api.main:app --port 8000`; frontend (from `frontend/`): `npm run dev`; tests `.venv/Scripts/python -m pytest -q`; lint `ruff check`.

## Current numbers
- Data: 204 ingested cases (185 airline/travel) after removing 21 duplicate orders (`dedupe_orders.py`, reversible); 802 chunks, two vectors each (standard + late chunking); case_texts in Postgres (`STORE_TEXT=true`, reversible). Dispute-type coverage in the eval label set: cancel/refund 20, denied boarding 16, baggage 47, delay 22, agent/package 58.
- Shipped retrieval: query rewrite (1 LLM call) + hybrid dense/keyword RRF on LATE-CHUNKING vectors (`USE_LATE_CHUNKING=true`), no reranker, no graph merge. Eval (27 stories): hit@5 1.00, P@5 0.72, MRR 0.90, nDCG@10 0.69. Reranking on derived text and graph expansion did not help (reported honestly in README/eval).
- Label accuracy (reviewed by Claude, not a human): fresh blind sample 71% (95% CI 55-84, n=35); after the op_appeal_dismissed rule 77-81% but IN-SAMPLE. Main error: model says "unclear" when the airline's appeal was dismissed. Compensation amounts weaker (6/9 right where truth known). A third fresh sample is needed for a clean post-fix number.
- Spend: Indian Kanoon 80.6 INR used (500 free; local cap 200; production cap 0 so the live app never pays IK). Jina ~2.06M of 10M tokens. Groq free tier.

## Rules that bite (also in CLAUDE.md)
- Never say "you will win"; always show the disclaimer; AI outputs labelled AI-generated; stats computed in code.
- IKanoon logo unaltered, shown ONCE in a highlighted box above search results (user decision); About keeps a text credit.
- Before any batch run (ingest/embed/extract/eval) print estimate and get OK. The auto-mode classifier blocked a paid IK call once until the user explicitly said to run it: do not work around such blocks.
- Do not push without the user saying so (the user has said "push" for the work done so far; ask again for new work if unsure). No key rotation needed (user decision: keys were never committed; history scanned clean).
- Gotcha: backslash escapes written through the shell tool can arrive halved (`\b` becomes a backspace char, which silently breaks regexes). After writing regexes via heredocs, check for control characters.
- Gotcha: Supabase pooler occasionally drops connections; use `app.db.connect()`; long evals can still crash (re-run and verify results.md actually changed).
- Windows: kill background processes with PowerShell; scripts are Python.

## Pending / ideas (user asked me to decide what matters; none is blocking)
1. **Keep-alive does not work.** `.github/workflows/keepalive.yml` is registered and succeeds, but GitHub ran it only 4 times in ~17 hours (not every 14 min), so Render still sleeps (first request ~30 s; UI says "waking up"). Fix needs the USER to create a free external monitor (cron-job.org or UptimeRobot, 5-14 min, URL `https://casecompass-qw3v.onrender.com/health`); an account sign-up is something Claude cannot do. Then remove or keep the workflow.
2. Mobile performance: local mobile Lighthouse median ~0.75 (live earlier 0.61); remaining cost is GSAP/ScrollTrigger script evaluation and style/layout. A real fix means less animation on phones (changes the look: ask the user).
3. Third fresh 50-case blind review for an unbiased post-fix accuracy number; improve amount extraction.
4. Coverage is still thin (see numbers). IK's Rs 10,000/month non-commercial credit: the user emailed IK, no reply known. More discovery would need a plan, estimate and the user's OK.
5. Final detailed project guide (user request): build from `docs/guide-notes.md`, `eval/results.md`, `docs/eval.md`, `eval/review_results*.md`.
6. Scalability notes (advice already given): shared rate limiter if >1 instance, pooling, scheduled jobs; sign-ins deliberately not needed (anonymous use, stories never stored).
7. Smaller: choose a LICENSE; confirm the repo should stay public; README is current but could use an architecture image.
