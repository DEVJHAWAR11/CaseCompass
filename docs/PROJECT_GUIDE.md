# CaseCompass: the project guide

A plain-language, then technical, walkthrough of what was built, why, what the numbers say, and what
went wrong on the way. Every figure comes from a real run (sources in `docs/guide-notes.md`,
`eval/results.md`, `eval/review_results*.md`). Weak results are reported as weak on purpose.

Live: frontend https://case-compass-zeta.vercel.app, backend https://casecompass-qw3v.onrender.com
Code: GitHub `DEVJHAWAR11/CaseCompass`.

---

## 1. What it is, in one minute

You describe a consumer dispute in everyday words ("airline cancelled my flight, no refund for three
months"). CaseCompass finds similar past cases from India's consumer commissions (NCDRC and state
commissions), and for each one shows who won, the refund and compensation, the laws cited, the verbatim
final-order sentence, and a link to the judgment. It adds up the outcomes in code ("7 of 10 similar
cases ordered a refund").

What it will never do: predict your result or give legal advice. The disclaimer is always shown and
every AI-produced field is labelled "AI-generated".

Why it exists: it is a portfolio project about **advanced retrieval-augmented generation (RAG)**. The
retrieval pipeline and honest evaluation matter more than the interface.

First category: airline and travel refunds. The code is organised so other categories can be added.

## 2. The plain-English idea of the pipeline

Think of a very fast law-library assistant:

1. **Rewrite**: a person's story is vague ("they ghosted me on the refund"). One small AI call turns it into up to three
   legal-sounding search phrases ("deficiency in service refund of cancelled air ticket").
2. **Search two ways at once**: *meaning search* (vectors, finds paragraphs that mean the same thing even with
   different words) and *keyword search* (finds exact terms like "Section 14"). The two ranked lists are merged with
   Reciprocal Rank Fusion (RRF), which rewards cases that appear high in both.
3. **Show structured answers**: each case was read offline by an AI that filled a small form (who won, amounts, laws,
   one-line summary). Code, not AI, counts the outcomes.

The technical version of the same pipeline:

```
story -> LLM rewrite (<=3 queries, ~150 tokens out)
      -> per query: pgvector cosine (HNSW) on late-chunked vectors + tsvector keyword (GIN)
      -> RRF (k=60), one best chunk per case
      -> [optional, off by default] Jina rerank
      -> case rows: extracted outcome fields + verbatim operative order + stats computed in code
      -> separate "related cases" list from the citation graph (networkx)
```

Offline side: ingest from Indian Kanoon -> clean and store text -> structural chunking -> embeddings
(Jina) -> outcome extraction (Groq, cascade) -> code rules -> dedupe.

## 3. Data

- Source: the Indian Kanoon (IK) API. Auth is a token header. Costs: search 0.50 INR, document 0.20 INR,
  fragment 0.05, metainfo 0.02. 500 INR free credit. Every response is cached on disk.
- Discovery: keyword searches with the `doctypes=consumer` filter, then code drops obvious noise (not a consumer
  commission, off-topic by title regex) before paying for documents.
- Rounds: round 1, 152 ingested; round 2 (12 narrower queries), +73. A review then found 21 cases sharing one
  identical final order across connected appeals, marked as duplicates (reversible). **Final: 204 ingested cases,
  185 in the airline/travel label set**, 802 chunks, 851+ citation edges (sparse: few corpus cases cite each other).
- IK spend: **80.6 INR of 500**. The production backend has `IK_SPEND_CAP_INR=0`, so the live app never pays IK.
- Storage decision: IK's terms are silent on storing text. The owner chose to store cleaned judgment text in
  Postgres (`STORE_TEXT=true`) and emailed IK. Fully reversible (`STORE_TEXT=false`, `drop table case_texts`).
  It makes the app independent of live IK calls and makes re-extraction free.
- Coverage by dispute type (eval label set): cancel/refund 20, denied boarding 16, baggage 47, delay 22,
  agent/package 58. Cancel/refund and denied boarding are thin; this is the main data weakness.
- Other sources considered and why not: e-Jagriti (official; CAPTCHA, no judgment-text search, automated
  collection would mean bypassing the CAPTCHA, which we will not do); AWS open data (wrong court level);
  research corpora (not confirmed public); commercial APIs (vendor claims unverified).

## 4. Chunking and embeddings

- Most judgments are plain text with no structure tags, so chunking uses heading regexes plus positional
  fallbacks (last 15% = order). Chunks are typed: facts, issues, order. Max ~450 tokens each; 802 chunks
  (~3.6 per case). Rows store offsets, vectors and a tsvector, not the text; text lives in `case_texts`.
- Embeddings: `jina-embeddings-v3`, 1024 dimensions, 8192-token window, task types `retrieval.query` for
  the user's query and `retrieval.passage` for the corpus (using the right pair matters). The model name and
  dimension are stored in the database and config.
- **Late chunking** (plain terms: embed the whole document in one pass, then cut the token vectors into chunks, so each
  chunk "remembers" its surroundings). Two vectors are stored per chunk (standard and late) so the ablation compares
  chunking only.
- Corpus embedding is an offline script; at runtime only the query is embedded, and query embeddings are cached.
- Jina use: about 2.06M of the 10M free tokens. Tracked in a ledger, warns at 70%, hard-stops at 90%, and the
  app then falls back to keyword-only with a notice.

## 5. Outcome extraction

- A small LLM (Groq `gpt-oss`) reads only the first facts chunk (<=1,200 chars) plus the last 2,400 chars (the order),
  never the whole judgment (about 88% are truncated by design, to cap cost at ~4,000 tokens). It returns tiny JSON:
  result (allowed / partly_allowed / dismissed / unclear), refund, compensation, laws, one-line summary. Pydantic
  validates it; a **cascade** escalates to the larger model only on validation failure or "unclear" (about 15-19% escalate).
- **Code rules after the model** (code before LLM):
  - `rule_override`: reads the final order text for who won.
  - `op_appeal_dismissed`: if the airline's appeal was dismissed (award stands), a model "unclear" becomes "allowed".
  - `amounts_from_order`: a parser for "Rs. 2 lakhs", "lump sum", "Rs. 2 lacs" etc. that fills compensation only when the model gave none.
  - `operative_order`: copies the last one or two operative sentences verbatim (no model) for the card.
- Mistakes made and fixed along the way:
  1. The first prompt confused who appealed (an airline's winning appeal means the complainant lost). Fix: a rule on the order text (changed 24 labels).
  2. Amounts like "2 lakhs" were dropped by a digit guard. Fix: lakh parser.
  3. Re-running extraction twice exhausted the small model's daily quota. Fix: extraction on the larger model.
  4. Two regexes silently broke because backslash escapes arrived halved through the shell tool. Fix: check for control characters after writing regexes.
  5. 11 of 185 summaries only said "details missing"; these are now dropped at serve time and the card shows the outcome and link instead.

## 6. Evaluation

### Retrieval (27 scored stories, 204 cases)

| Pipeline | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|
| naive vector | 0.96 | 0.66 | 0.89 | 0.65 |
| + hybrid (RRF) | 0.96 | 0.70 | 0.88 | 0.64 |
| + Jina rerank (derived text) | 0.96 | 0.66 | 0.87 | 0.61 |
| + query rewriting | 0.96 | 0.67 | 0.93 | 0.64 |
| + citation-graph merge | 0.96 | 0.67 | 0.93 | 0.60 |
| **hybrid + rewriting + late chunking (shipped)** | **1.00** | **0.72** | 0.90 | **0.69** |
| keyword only | 1.00 | 0.48 | 0.80 | 0.53 |
| rewriting via HyDE instead | 0.93 | 0.69 | 0.87 | 0.65 |

What the numbers honestly say:
- Hybrid and late chunking help; rewriting mostly helps rank the first good hit (MRR 0.93 vs 0.88).
- **Reranking did not help** here: on our derived text it scored worse (nDCG 0.59-0.61 vs 0.64-0.68), and on the real
  matched passage it was about equal. It stays off (`RERANK_ENABLED=false`). Our derived summaries describe the
  outcome, not the dispute, so they do not match a user's story.
- **Graph merge lowered nDCG** (0.60) because it replaced result slots with related cases of different dispute types, so
  the graph is shown as a separate "related cases" list.
- Limits you should state in an interview: relevance labels are rule-based dispute-type tags, not human-judged;
  a "relevant" set is 15-45 cases per story, so hit@5 is easy to satisfy; 27 stories means differences of ~0.03 are
  noise. recall@10 is low only because many cases are marked relevant per story.

### Outcome-label accuracy (reviewed by Claude, not a human)

| Sample | Condition | Result |
|---|---|---|
| 1 (n=42 judgeable) | before fixes | 76% (61-87%) |
| 1 | after rules, in-sample | 81% (67-90%) |
| 2 fresh (n=35) | blind, before the extended rule | **71%** (55-84%) |
| 2 | after rules, in-sample | 77% |
| 3 fresh (n=27) | blind, rules frozen | **78%** (59-89%) |

Reading: the honest range is roughly **71-78%**. Intervals overlap heavily because samples are small. The dominant
failure is "who appealed" (model says unclear or dismissed when the airline's appeal failed). Amounts are weaker:
compensation matched 3 of 6 verified cases in sample 3 (two misses were Rs 5,000 off because the model added costs;
a definition problem) and 6 of 9 in sample 2. Caveat that matters: the reviewer is a model reading the last 900
characters, so it is a strong sanity check, not ground truth; a lawyer-reviewed sample would be the real test.

## 7. The application

- **Backend** (FastAPI, Pydantic, async httpx): `/health`, `/search`, `/passage/{tid}`, `/case/{tid}` (metadata only), `/usage`.
  Graceful fallbacks: embeddings out -> keyword-only with a notice; LLM out -> no rewriting with a notice; IK out ->
  passages omitted with a notice. Exact lookups (case numbers, party names) skip the LLM and Jina.
- **Search makes zero IK calls.** Ranking uses stored fields; the matched passage loads only when the user opens
  "Why this result" (`/passage`, range validated to <=3,000 chars).
- **Cost and safety controls**: per-IP rate limit (10 searches/min, 30/min on passage/case), global cap of 60 searches/min, a hard
  cap on LLM calls per request, a daily token budget, and a usage ledger (tokens in/out, estimated cost, stage).
  Client IP trusts only the proxy-added forwarded entry (a rotating fake IP cannot bypass limits). A CDN header
  is used on Render. `/case` no longer returns judgment text, so there is no bulk-text endpoint.
- **Database** (Supabase Postgres): tables cases, citations, chunks, case_texts, usage_log, jobs, plus migrations
  tracked in `schema_migrations`. Migration 004/005: row-level security on every table and all privileges revoked from
  Supabase's public API roles, after finding that tables created by SQL were readable with the public key.
  `app.db.connect()` retries dropped pooler connections.
- **Frontend** (Next.js 16 App Router, Tailwind 4, GSAP + Lenis): `/` illustrated scroll-story landing page, `/search` the tool
  (full pipeline, hybrid, naive, or compare-all columns), `/about` with source credit. Result cards lead with the
  verbatim operative order, an AI-labelled summary, outcome badge, amounts, laws, and the source link. The IKanoon logo
  is shown once, unaltered, in a highlighted box above results. Reduced-motion users get no animation.
- **Testing and CI**: 30 tests (10 database/Jina integration tests skip without credentials), plus a retrieval regression
  suite of five fixed stories. GitHub Actions runs ruff + pytest and eslint + `next build` on every push. Green.

## 8. Deployment and operations

- Backend: Render free, Docker (`backend/Dockerfile`), auto-deploy on push to main (~3-4 min). Frontend: Vercel Hobby, root
  directory `frontend`, env `NEXT_PUBLIC_API_URL`. `docs/DEPLOY.md` has the steps and every gotcha hit (Blueprint ignored when
  the service is made by hand, wrong CORS string, Vercel multi-service prompt, env form needing real typing).
- **The free backend sleeps after ~15 minutes idle**; the first request then takes ~30-60 s and the UI says "waking up".
  A GitHub Actions cron ping was tried (every 14 min) but GitHub's scheduler is best effort: it ran 4 times in 17 hours, each
  time hitting a cold server, so it cannot keep the service awake. Mitigations: the site pings `/health` when any page opens, so the
  wake overlaps with reading; the durable fix is an external monitor (cron-job.org or UptimeRobot, 5-14 minute interval, free) pointing at
  `/health`. Note one always-on free service uses about 744 of Render's 750 free hours per month.
- Spend summary: IK 80.6 INR, Jina ~2.06M tokens, Groq free tier only, hosting free.
- Performance: desktop Lighthouse 97-98 (local production build). Mobile is the weak spot: median ~0.75 locally (0.61 on the live
  site earlier), because of GSAP/ScrollTrigger script evaluation. A real fix means less animation on phones, which changes the look.

## 9. Rules the project follows (and why)

- Never "you will win"; always the disclaimer; AI fields labelled. (Legal-information tools must not look like advice.)
- Counts and statistics are computed in code from extracted fields; the LLM only phrases things. (Models invent numbers.)
- IK: private token only in backend env; logo unaltered; no implied endorsement; cache every response; never hard-depend on live IK.
- Before any batch run, print an estimate and wait for OK. Secrets only in `.env`; history and tree were scanned clean for key values.
- Legal note (secondary source, not advice): in Indian law, raw judgment text has been held not copyrightable (Eastern Book Co.), so the
  restrictions here come from contract terms (IK API terms), not copyright.

## 10. Limitations, stated plainly

1. Small corpus (204 cases) for a field with thousands of decisions; cancel/refund and denied boarding are thin.
2. Outcome labels are about 71-78% accurate by a model reviewer; amounts are worse. Treat them as hints, read the order and the judgment.
3. Eval labels are coarse, rule-based and not human-checked; 27 stories is small.
4. No human or lawyer review anywhere in the loop.
5. Free-tier hosting: cold starts, in-memory rate limiter (fine for one instance only), 750-hour monthly cap.
6. Mobile performance is mediocre by design choice of the animated landing page.
7. IK text storage rests on the owner's decision while the terms are silent and IK's reply is pending.

## 11. What I would do next

1. Add the external uptime monitor (the owner's sign-up).
2. A lawyer-reviewed or at least multi-reviewer label sample; fix "who appealed" with a structured parse of the case header (appellant vs respondent), not just order text.
3. More coverage, once IK's non-commercial monthly credit is confirmed: 200-300 cases targeted at cancel/refund and denied boarding. Print the estimate first.
4. Human-judged relevance for the eval (graded 0-2), which would also test whether reranking helps on better labels.
5. Shared rate limiter (Redis) and connection pooling if more than one instance is ever run; scheduled ingestion jobs.
6. Fewer animated sections on phones for the Lighthouse score.
7. Choose a LICENSE and an architecture diagram for the README.

## 12. How to run it

```bash
cp .env.example .env            # your own keys (never commit)
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
PYTHONPATH=. .venv/Scripts/python scripts/migrate.py
PYTHONPATH=. .venv/Scripts/python -m uvicorn app.api.main:app --port 8000
cd ../frontend && npm install && npm run dev        # http://localhost:3000
.venv/Scripts/python -m pytest -q                     # from backend/
python eval/run_eval.py                               # regenerates eval/results.md
```

Code map: `backend/app/retrieval/` (search, pipeline), `extraction/extract.py` (LLM + rules), `chunking/`, `embeddings/jina.py`,
`llm/` (provider, cascade, rewrite), `graph/`, `textstore.py`, `api/main.py`, `backend/scripts/` (ingest, embed_corpus,
extract_outcomes, apply_rules, dedupe_orders, make_review_sheet, migrate, backfill_text), `frontend/components/ResultCard.tsx`,
`eval/` (stories, labels, variants, run_eval.py, results, review sheets' aggregates).

## 13. Interview-ready talking points

- "I built the eval first-class and reported what did not work": reranking and graph merging both lowered or did not improve
  nDCG on this corpus, and I shipped the simpler pipeline.
- "Code before LLM": regex and parsers for amounts and the operative order; counts in code; the model only phrases or extracts.
- "Measured my own labels": three samples, confidence intervals, in-sample vs fresh separated, and the failure mode named.
- "Cost as a design constraint": zero IK calls per search, cached embeddings, token ledger, hard caps, graceful degradation.
- "Security I actually found": Supabase tables created via SQL had RLS off; fixed with RLS plus privilege revocation and verified.
