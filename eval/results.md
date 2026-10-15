Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.19 | 0.96 | 0.66 | 0.89 | 0.65 |
| 2. + hybrid (vector + keyword, RRF) | 0.19 | 0.96 | 0.70 | 0.88 | 0.64 |
| 3. + Jina rerank (on our derived text) | 0.18 | 0.96 | 0.66 | 0.87 | 0.61 |
| 4. + query rewriting | 0.18 | 0.96 | 0.67 | 0.93 | 0.64 |
| 5. + citation-graph expansion | 0.16 | 0.96 | 0.67 | 0.93 | 0.60 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.17 | 1.00 | 0.48 | 0.80 | 0.53 |
| naive, late chunking | 0.21 | 0.96 | 0.73 | 0.87 | 0.70 |
| hybrid, late chunking | 0.22 | 1.00 | 0.73 | 0.88 | 0.68 |
| hybrid, no rerank (= stage 2) | 0.19 | 0.96 | 0.70 | 0.88 | 0.64 |
| hybrid + rerank on derived text (= stage 3, shipped) | 0.18 | 0.96 | 0.66 | 0.87 | 0.61 |
| hybrid + rerank on matched passage (needs live IK fetch) | 0.22 | 0.96 | 0.67 | 0.87 | 0.66 |
| hybrid + rewriting, no rerank (shipped default) | 0.21 | 0.96 | 0.68 | 0.88 | 0.67 |
| hybrid + rewriting, late chunking | 0.22 | 1.00 | 0.72 | 0.90 | 0.69 |
| rewriting via HyDE instead | 0.18 | 0.93 | 0.69 | 0.87 | 0.65 |

## Notes (corpus: 204 ingested cases after removing 21 duplicate orders; 185 in the label set)
- Shipped default is hybrid + query rewriting on late-chunking vectors (`USE_LATE_CHUNKING=true`): hit@5 1.00, P@5 0.72, MRR 0.90, nDCG 0.69, versus 0.96 / 0.68 / 0.88 / 0.67 on standard vectors. Better or equal on every metric.
- Reranking on text built from our own derived fields scored worse than plain hybrid (nDCG 0.61 vs 0.64); on the real matched passage it was about equal to the best non-late variants but needs a live fetch. It stays off (`RERANK_ENABLED=false`).
- Citation-graph expansion lowers nDCG (0.60), so related cases are shown separately, not merged into results.
- recall@10 is low only because the coarse rule-based labels mark many cases relevant per story (up to ~60); compare hit@5, P@5, MRR and nDCG instead.
- Labels are rule-based on dispute-type tags, not hand-checked. Eval was first run on 152 cases (nDCG 0.70 best), then 225, then 204 after dedupe; numbers moved by about 0.01-0.03, within noise for 27 stories.
