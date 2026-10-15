# Guide notes (raw material for the final project guide)

Keep this current. Every number here comes from a real run; mistakes are recorded on purpose.

## Data (Phases 1-2)
- Source: Indian Kanoon API, token auth. Search 0.50 INR/page (10 docs), doc 0.20 INR.
- Discovery: 8 queries x 3 pages with `doctypes=consumer` -> 199 new candidates, 45 dropped by code
  (34 not consumer commission, 11 off-topic by title/snippet regex). Fetch: 152 ingested, 2 duplicates (text hash).
- Corpus: 152 ingested (29 NCDRC, 121 state, 2 Supreme Court); 139 tagged airline/travel by extraction, 13 "other".
- Citation edges: 851 (561 nodes). Only 38 corpus cases are cited by other corpus cases (graph is sparse).
- IK spend: 47.4 INR of 500 (166 live calls). Spend cap in code: 100 INR.

## Chunking and embeddings (Phase 3)
- Judgments are mostly plain `<pre>` text, no structure tags -> heading regexes + positional fallback
  (last 15% = order if no order heading). 548 chunks (facts 282, order 244, issues 22); 3.6 chunks/case.
- Embedded only facts (first 2 chunks), issues (first 1), order (last 2). Max 1800 chars (~450 tokens) each.
- Model: jina-embeddings-v3, 1024 dims, tasks retrieval.query / retrieval.passage, normalized.
  Two vectors per chunk: standard and late-chunked (all chunks of a case in one request).
- Chunk rows hold offsets + vectors + tsvector, not text. HNSW cosine indexes + GIN on tsvector.
- Jina tokens used for corpus: ~410K standard+late (4.1% of 10M pool) incl. a lost first run (commit bug: autocommit was off,
  vectors were re-used from the disk cache on rerun, so no tokens were wasted twice).

## Retrieval (Phases 3-4)
- Hybrid = dense + tsvector (keyword query = words OR-ed) fused with RRF (k=60), one best chunk per case.
- Rerank: jina-reranker-v2-base-multilingual on top 20 cases, chunk text trimmed to 1200 chars.
- Rewriting: one call -> up to 3 queries (max_tokens 400 because gpt-oss reasoning tokens count), HyDE as alternative.
  Original story + rewrites all go into the RRF fusion; rerank uses the original story.

## Extraction (Phase 5)
- Prompt returns {r, ref, comp, rel, s}. Input = first facts chunk (<=1200 chars) + order (last 2400 chars). 88% of cases truncated by design.
- Result: 66 allowed, 38 dismissed, 26 partly allowed, 22 unclear (after code rules). Escalation to larger model ~15%.
- Mistakes: (1) first prompt confused who appealed (airline's winning appeal = complainant lost) -> reprompted and added a regex
  rule on the final order text (changed 24 labels). (2) amounts written as "2 lakhs" were dropped by the digit guard -> lakh parser.
  (3) Re-running extraction twice burned gpt-oss-20b's 200K/day quota; switched extraction to gpt-oss-120b.
- Rough accuracy: ~70% of outcomes I could verify from order text were right before the rule fix; not re-measured after. Amounts often missing.

## Eval (Phase 6)
- 27 scored stories; labels = dispute type by rules (see docs/eval.md). Results: eval/results.md.
- LLM tagger (qwen3.8-27b) discarded: obvious denied-boarding/delay cases tagged "other".

## Groq free-tier facts
- Per model: 8,000 tokens/min, 200K tokens/day, 1,000 requests/day. Throttle must follow tokens/min, not requests/min.

## API (Phase 7)
- Endpoints: GET /health, POST /search {story, mode naive|hybrid|full, top}, GET /case/{tid}, GET /usage.
- Verified live: full mode rewrote the story into 3 queries, reranked, returned 5 cases with passages + computed stats + 3 related cases; per-IP limit returned 429 after 10 requests/min; case-number input skipped LLM and Jina (keyword route); 6 unit tests pass.
- Decision: summary sentence is a code template, not LLM-phrased (cannot invent facts, saves quota). Graph expansion is shown as a separate related_cases list, not mixed into ranking, because the eval showed mixing it in lowers nDCG.
- Fallbacks: Jina exhausted/unreachable -> keyword-only + notice; LLM unavailable -> no rewriting + notice; IK unreachable -> passages omitted + notice.
- Jina tokens used so far: 982,914 (9.8% of pool); Groq last 24h: 87,598 tokens.

## Frontend (Phase 8)
- Next.js 16 (App Router) + TypeScript + Tailwind 4. One page: big text box, 4 view buttons (Full pipeline / Hybrid / Naive / Compare all = 3 parallel requests side by side), result cards (outcome badge, refund, compensation, laws, AI-generated label, source link), Why-this-result drawer (matched passage), related-cases accordion, disclaimer, /about page with data-source credit.
- Error states: rate limited (429), server error, unreachable, waking-up message after 4s, API notices (Jina fallback, rewriting unavailable, passages unavailable).
- IKanoon logo: component expects the official file at frontend/public/ikanoon-logo.png (unaltered); text credit shows until it is added. Not downloaded by me: needs the owner to supply it.
- Verified in the browser pane: compare view rendered 3 columns with different summaries for the baggage story (naive 7/10 favoured, hybrid 7/10, full 9/10); drawer works; mobile width works.

## Landing page (Phase 8b)
- Route / is a scroll-story landing page; the search tool moved to /search (restyled to the same parchment palette).
- Stack added: gsap 3.15 (ScrollTrigger) + lenis 1.3 (smooth scroll driven by gsap.ticker). React Bits-style pieces (CountUp, Magnet, SpotlightCard, TiltCard, line-by-line headline reveal) were written in-repo instead of copied, to share one GSAP setup; Framer Motion not used (saves weight).
- Hero depth is faked from one flat painting: the same image stacked 3x, each masked to a depth band and moved at its own speed (mouse max 12px, scroll scrub); the scales get a ±1.5° sway via a 4th masked copy. Phones get one flat copy only.
- Birds: canvas boids (separation/alignment/cohesion + wind + cursor avoidance + scroll lift), 18 desktop / 7 phone; final CTA birds land on perch points mapped through object-fit cover math.
- Reduced motion: no curtain, no birds, no pins, content fully visible. QA override: add ?motion=force to the URL.
- Lighthouse (production build, local): desktop performance 98, accessibility 96, best practices 96, SEO 100, LCP 0.9s, CLS 0. Mobile (simulated slow 4G) performance 84-87, LCP 3.9-4.2s. Mobile started at 75; fixes: dropped Source Serif font, fewer font weights, no curtain on phones, single art layer on phones.
- Honest content choices: problem-section counters use our real corpus numbers (152 judgments, 851 citation links, 548 passages), not unverified national statistics; the trust section shows our own commitments, not invented testimonials; demo cards are real cases from the index with AI-extracted outcomes, labelled as such.
- IKanoon logo: still a text credit until the official file is placed at frontend/public/ikanoon-logo.png.

## Birds and speed pass
- Birds redrawn as side-profile pigeons (teardrop body, head + beak, fanned tail, long notched wings, far wing behind at 60% alpha); flapping is a scaleY on the wing, in bursts with glides. The flock was replaced by occasional groups of 1-3 birds crossing every 4-9 s (max 6 on screen, 3 on phones), mostly left to right, kept above the headline on desktop. Perched birds in the final scene use the same drawing with folded wings and feet.
- Speed changes: removed mix-blend-mode from the full-screen grain, light rays and cursor (blend modes force extra compositing on every scroll frame); dropped the mid parallax layer (one less full-size decode); phones request a smaller hero image (sizes 120vw); Lenis skipped on touch screens; the sky canvas starts 1.2 s after load.
- Lighthouse after the pass (local production build): desktop 97-98; mobile 79-83 across three runs (LCP ~4.0 s on simulated slow 4G). Local mobile scores swing by about 10 points between runs. Biggest remaining mobile cost: decoding the full hero painting; next step would be a pre-cropped mobile image.

## No-IK-calls-during-search redesign
- Problem: the full pipeline fetched up to 20 judgments per search (0.20 INR each when uncached; the deployed server starts with an empty disk cache).
- Fix 1: ranking and reranking use only stored fields; search makes zero IK calls (verified: spend ledger unchanged across a search). Fix 2: the matched passage is fetched on demand by GET /passage/{tid}?start&end when the user opens 'Why this result' (one call per click, range validated to <=3000 chars). Fix 3: reranking disabled by default (RERANK_ENABLED=false) because the eval showed it does not help.
- Eval: rerank on derived text nDCG 0.59 (worse than hybrid 0.68); rerank on passage 0.67; hybrid + rewriting without rerank 0.70 (best, MRR 0.93).
- Draft email to Indian Kanoon about storing text: docs/ikanoon-email.md (optional).

## Source research (Indian Kanoon limits, alternatives)
- Read IK terms (api.indiankanoon.org/terms): storage/caching/redistribution/derivative works are NOT addressed (neither allowed nor prohibited); no rate limits stated; attribution/logo mandatory including for RAG (About section ok); no mention of commercial vs non-commercial; either side may terminate with 1 month notice; data as-is.
- Read IK pricing: search 0.50, original document 0.50, document 0.20, fragment 0.05, metainfo 0.02; Rs 500 sign-up credit; NON-COMMERCIAL USE GETS Rs 10,000 FREE EACH MONTH after the administrator verifies the use case. We had treated Rs 500 as the ceiling: that limit was largely self-imposed (not yet applied for).
- e-Jagriti (official portal): public advance search needs a CAPTCHA, searches only complainant/respondent/industry name by commission and filing-date range, not judgment text; Terms & Conditions allow reproduction if accurate, not misleading, source acknowledged, third-party copyright excluded. Automated collection would require bypassing the CAPTCHA, which we will not do. Not a viable bulk source.
- Other sources: AWS Open Data (Supreme Court + 25 High Courts, CC-BY-4.0, wrong court level); research corpora (Nyay-Darpan 570 consumer cases, DRAssist NCDRC insurance cases) not confirmed public; commercial APIs (Vaquill, eCourtsIndia: vendor claims unverified; CaseMine/SCC/Manupatra subscription only).
- Legal note (secondary source, not legal advice): Eastern Book Co. case held raw judgment text has no copyright in India; restrictions come from contract terms (IK API terms, portal terms).
