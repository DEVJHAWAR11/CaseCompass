Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.18 | 0.96 | 0.61 | 0.87 | 0.61 |
| 2. + hybrid (vector + keyword, RRF) | 0.19 | 0.96 | 0.64 | 0.89 | 0.62 |
| 3. + Jina rerank (on our derived text) | 0.17 | 0.96 | 0.61 | 0.89 | 0.58 |
| 4. + query rewriting | 0.17 | 0.96 | 0.64 | 0.91 | 0.61 |
| 5. + citation-graph expansion | 0.15 | 0.96 | 0.64 | 0.91 | 0.57 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.15 | 1.00 | 0.47 | 0.76 | 0.47 |
| naive, late chunking | 0.19 | 0.96 | 0.63 | 0.82 | 0.60 |
| hybrid, late chunking | 0.20 | 1.00 | 0.68 | 0.85 | 0.63 |
| hybrid, no rerank (= stage 2) | 0.19 | 0.96 | 0.64 | 0.89 | 0.62 |
| hybrid + rerank on derived text (= stage 3, shipped) | 0.17 | 0.96 | 0.61 | 0.89 | 0.58 |
| hybrid + rerank on matched passage (needs live IK fetch) | 0.21 | 0.96 | 0.63 | 0.89 | 0.66 |
| hybrid + rewriting, no rerank (shipped default) | 0.19 | 0.96 | 0.64 | 0.91 | 0.63 |
| hybrid + rewriting, late chunking | 0.20 | 1.00 | 0.67 | 0.96 | 0.66 |
| rewriting via HyDE instead | 0.17 | 0.93 | 0.62 | 0.87 | 0.60 |

## Notes (corpus: 627 searchable cases across nine categories; the airline eval searches only the airline_travel category, about 215 cases)
- Final run on the full collection: shipped default (hybrid + rewriting, late-chunking vectors) hit@5 1.00, P@5 0.67, MRR 0.96, nDCG 0.66. History: 1.00 / 0.72 / 0.90 / 0.69 on 204 cases, 1.00 / 0.70 / 0.94 / 0.68 on 424. Precision drifts down a little because the extra airline/travel cases found later have no hand labels and count as irrelevant; MRR went up. Differences of about 0.03 are within noise for 27 stories.
- Reranking on text built from our own derived fields is still worse than plain hybrid (nDCG 0.58 vs 0.62); on the real matched passage it is about equal or slightly better (0.66) but needs a live fetch. It stays off (`RERANK_ENABLED=false`).
- Citation-graph expansion still lowers nDCG (0.57), so related cases are shown separately.
- recall@10 is low only because the coarse rule-based labels mark many cases relevant per story.
- Labels are rule-based dispute-type tags, not hand-checked. Other categories are checked separately in `eval/results_multi.md`.
