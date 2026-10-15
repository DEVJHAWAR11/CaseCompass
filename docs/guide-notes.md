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
