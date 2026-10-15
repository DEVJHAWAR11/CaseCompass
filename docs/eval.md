# Eval notes

Results table: `eval/results.md` (regenerate: `backend/.venv/Scripts/python eval/run_eval.py`).

## How relevance was decided
- 30 plain-language stories (`eval/stories.json`); 27 are scored. Three have no single dispute type.
- A case is relevant to a story when it has the dispute type the story describes
  (cancel/refund, denied boarding, baggage, delay, agent/package). Types come from plain
  rules over each case's title and text (`eval/make_labels.py`), not from the retrieval system.
- An LLM tagger was tried first and discarded: it put obvious denied-boarding and delay cases under "other".

## Honest limits
- Only 139 airline/travel cases, and a "relevant" set is 15-45 cases per story (up to a third of
  the corpus), so recall@5/hit@5 are easy to score well on and differences between stages are small.
- Labels are coarse (dispute type only) and rule-based, so they can favour keyword-style search.
- 27 stories is a small sample; differences of ~0.03 are within noise.
- Reranking and the graph step did not help here. The graph step lowered nDCG (0.69 -> 0.60) because it
  replaces the last 3 slots with related cases that are often a different dispute type.
- Late chunking is roughly equal to standard chunking (slightly better on naive search).
