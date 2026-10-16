Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.19 | 0.96 | 0.66 | 0.87 | 0.65 |
| 2. + hybrid (vector + keyword, RRF) | 0.19 | 0.96 | 0.67 | 0.89 | 0.63 |
| 3. + Jina rerank (on our derived text) | 0.17 | 0.96 | 0.65 | 0.87 | 0.59 |
| 4. + query rewriting | 0.17 | 0.96 | 0.66 | 0.91 | 0.62 |
| 5. + citation-graph expansion | 0.15 | 0.96 | 0.66 | 0.91 | 0.58 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.15 | 1.00 | 0.47 | 0.75 | 0.47 |
| naive, late chunking | 0.20 | 0.96 | 0.70 | 0.87 | 0.66 |
| hybrid, late chunking | 0.21 | 1.00 | 0.69 | 0.86 | 0.66 |
| hybrid, no rerank (= stage 2) | 0.19 | 0.96 | 0.67 | 0.89 | 0.63 |
| hybrid + rerank on derived text (= stage 3, shipped) | 0.17 | 0.96 | 0.65 | 0.87 | 0.59 |
| hybrid + rerank on matched passage (needs live IK fetch) | 0.21 | 0.96 | 0.65 | 0.87 | 0.66 |
| hybrid + rewriting, no rerank (shipped default) | 0.20 | 0.96 | 0.67 | 0.88 | 0.66 |
| hybrid + rewriting, late chunking | 0.21 | 1.00 | 0.70 | 0.94 | 0.68 |
| rewriting via HyDE instead | 0.18 | 0.93 | 0.67 | 0.87 | 0.63 |

## Notes (corpus: 614 searchable cases across nine categories (multi-category numbers below were measured on the earlier 424); the airline eval searches only the airline_travel category)
- Re-run after adding about 220 cases from other categories and travel extras: shipped default (hybrid + rewriting, late-chunking vectors) hit@5 1.00, P@5 0.70, MRR 0.94, nDCG 0.68, versus 1.00 / 0.72 / 0.90 / 0.69 on the earlier 204-case corpus. Flat within noise. New airline/travel cases found by the extra queries have no hand labels, so they count as irrelevant here and push precision down slightly.
- Reranking on text built from our own derived fields is still worse than plain hybrid (nDCG 0.59 vs 0.63); on the real matched passage it is about equal (0.66). It stays off (`RERANK_ENABLED=false`).
- Citation-graph expansion still lowers nDCG (0.58), so related cases are shown separately.
- recall@10 is low only because the coarse rule-based labels mark many cases relevant per story.
- Labels are rule-based dispute-type tags, not hand-checked. Other categories are checked separately in `eval/results_multi.md`.
