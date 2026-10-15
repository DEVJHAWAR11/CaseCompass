Eval over 27 stories (relevance labels: see docs/eval.md).

### Pipeline stages

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| 1. naive vector search | 0.23 | 0.96 | 0.67 | 0.84 | 0.63 |
| 2. + hybrid (vector + keyword, RRF) | 0.27 | 1.00 | 0.76 | 0.88 | 0.68 |
| 3. + Jina rerank (on our derived text) | 0.21 | 0.96 | 0.64 | 0.87 | 0.59 |
| 4. + query rewriting | 0.23 | 0.96 | 0.63 | 0.93 | 0.62 |
| 5. + citation-graph expansion | 0.18 | 0.96 | 0.63 | 0.93 | 0.56 |

### Ablations

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| keyword only (basic search) | 0.22 | 0.96 | 0.50 | 0.77 | 0.53 |
| naive, late chunking | 0.28 | 1.00 | 0.73 | 0.88 | 0.70 |
| hybrid, late chunking | 0.27 | 1.00 | 0.75 | 0.92 | 0.68 |
| hybrid, no rerank (= stage 2) | 0.27 | 1.00 | 0.76 | 0.88 | 0.68 |
| hybrid + rerank on derived text (= stage 3, shipped) | 0.21 | 0.96 | 0.64 | 0.87 | 0.59 |
| hybrid + rerank on matched passage (needs live IK fetch) | 0.28 | 1.00 | 0.68 | 0.85 | 0.67 |
| rewriting via HyDE instead | 0.23 | 0.96 | 0.67 | 0.91 | 0.64 |

### Added after the table above (same 27 stories, measured separately)

| Pipeline | recall@10 | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|---|
| hybrid + rewriting, no rerank (shipped default) | 0.27 | 1.00 | 0.71 | 0.93 | 0.70 |
