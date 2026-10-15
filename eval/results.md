Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.23 | 0.96 | 0.67 | 0.84 | 0.63 |
| 2. + hybrid (vector + keyword, RRF) | 0.27 | 1.00 | 0.76 | 0.88 | 0.68 |
| 3. + Jina rerank | 0.28 | 1.00 | 0.68 | 0.85 | 0.67 |
| 4. + query rewriting | 0.29 | 0.96 | 0.71 | 0.84 | 0.69 |
| 5. + citation-graph expansion | 0.24 | 0.96 | 0.71 | 0.84 | 0.60 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.22 | 0.96 | 0.50 | 0.77 | 0.53 |
| naive, late chunking | 0.28 | 1.00 | 0.73 | 0.88 | 0.70 |
| hybrid, late chunking | 0.27 | 1.00 | 0.75 | 0.92 | 0.68 |
| hybrid, no rerank (= stage 2) | 0.27 | 1.00 | 0.76 | 0.88 | 0.68 |
| hybrid + rerank (= stage 3) | 0.28 | 1.00 | 0.68 | 0.85 | 0.67 |
| rewriting via HyDE instead | 0.27 | 1.00 | 0.68 | 0.85 | 0.66 |
