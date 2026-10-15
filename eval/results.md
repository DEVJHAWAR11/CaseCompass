Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.15 | 0.96 | 0.65 | 0.87 | 0.64 |
| 2. + hybrid (vector + keyword, RRF) | 0.15 | 0.96 | 0.69 | 0.89 | 0.64 |
| 3. + Jina rerank (on our derived text) | 0.14 | 0.96 | 0.66 | 0.89 | 0.62 |
| 4. + query rewriting | 0.14 | 0.96 | 0.69 | 0.93 | 0.65 |
| 5. + citation-graph expansion | 0.12 | 0.96 | 0.69 | 0.93 | 0.60 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.12 | 1.00 | 0.48 | 0.79 | 0.52 |
| naive, late chunking | 0.16 | 0.96 | 0.73 | 0.87 | 0.70 |
| hybrid, late chunking | 0.16 | 1.00 | 0.72 | 0.88 | 0.68 |
| hybrid, no rerank (= stage 2) | 0.15 | 0.96 | 0.69 | 0.89 | 0.64 |
| hybrid + rerank on derived text (= stage 3, shipped) | 0.14 | 0.96 | 0.66 | 0.89 | 0.62 |
| hybrid + rerank on matched passage (needs live IK fetch) | 0.16 | 0.96 | 0.67 | 0.87 | 0.67 |
| hybrid + rewriting, no rerank (shipped default) | 0.15 | 0.96 | 0.69 | 0.88 | 0.66 |
| hybrid + rewriting, late chunking | 0.16 | 1.00 | 0.73 | 0.91 | 0.69 |
| rewriting via HyDE instead | 0.14 | 0.93 | 0.68 | 0.88 | 0.65 |

## Default changed to late chunking (2026-10-15)
- hybrid + rewriting on late-chunking vectors: hit@5 1.00, P@5 0.73, MRR 0.91, nDCG 0.69, versus 0.96 / 0.69 / 0.88 / 0.66 for the same pipeline on standard vectors. Better on every metric, so it is now the default (`USE_LATE_CHUNKING=true`). The standard vectors are kept so the ablation stays reproducible.
