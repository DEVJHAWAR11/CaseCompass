# CaseCompass

Describe a consumer dispute in plain words (a cancelled flight, lost baggage, a travel agent that
kept your refund) and CaseCompass finds similar past NCDRC and state commission cases in India. It
shows how each was decided (who won, refund, compensation, law cited) with a link to the judgment.

It never predicts your result. **This is information, not legal advice. Outcomes are AI-generated
from public records and may contain errors.**

This is a portfolio project about retrieval quality: the pipeline and the honest eval numbers matter
more than the UI.

## How it works

```
story -> rewrite into <=3 legal queries (1 LLM call)
      -> hybrid search: pgvector dense + tsvector keyword, merged with RRF
      -> structural chunks (facts / issues / reasoning / order), each with a context prefix
      -> answer: stats computed IN CODE from extracted fields + top passages
         (the LLM only phrases them; every claim cites a source case)
offline: ingest -> clean text -> chunk + embed (Jina) -> outcome extraction (Groq) -> rule checks
```

- **Data:** 204 consumer-commission cases (about 185 airline/travel, after removing 21 duplicate orders), 802 chunks, a citation graph
  (plain tables + networkx). Judgment text is cleaned and stored in Postgres, so search and passages
  need no live source calls.
- **Stack:** FastAPI + Pydantic, Supabase Postgres (pgvector + tsvector), Jina embeddings
  (`jina-embeddings-v3`, 1024 dims), Groq `gpt-oss` models with a small-then-large cascade,
  Next.js + Tailwind frontend.
- **Cost controls:** per-IP rate limit, hard cap on LLM calls per request, daily token budget,
  usage ledger, Jina quota tracking with keyword-only fallback.

## Eval (27 stories, 204 cases)

Relevance labels are coarse and rule-based (dispute-type tags), not hand-checked. Full tables and
ablations are in [`eval/results.md`](eval/results.md).

| Pipeline | hit@5 | P@5 | MRR | nDCG@10 |
|---|---|---|---|---|
| naive vector search | 0.96 | 0.66 | 0.89 | 0.65 |
| + hybrid (RRF) | 0.96 | 0.70 | 0.88 | 0.64 |
| + Jina rerank (derived text) | 0.96 | 0.66 | 0.87 | 0.61 |
| + query rewriting (no rerank) | 0.96 | 0.67 | 0.93 | 0.64 |
| + citation-graph expansion | 0.96 | 0.67 | 0.93 | 0.60 |
| hybrid + rewriting + late chunking (shipped) | 1.00 | 0.72 | 0.90 | 0.69 |

What did not help, reported honestly: reranking on our derived text did not beat plain hybrid, so it
is off by default; graph expansion lowered nDCG, so it is shown separately as "related cases". Late
chunking, combined with rewriting, was better on every metric and is the shipped default. Outcome labels: on a 50-case sample (42 judgeable) reviewed by Claude, not a human, 76% were correct;
after fixes made from that review, 81% on the same sample (optimistic, since the fixes were tuned
on it). A fresh sample is still to do. Details: `eval/review_results.md`.

## Run locally

```bash
cp .env.example .env            # add your own keys
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
PYTHONPATH=. .venv/Scripts/python scripts/migrate.py
PYTHONPATH=. .venv/Scripts/python -m uvicorn app.api.main:app --port 8000
cd ../frontend && npm install && npm run dev      # http://localhost:3000
```

Deploy: backend on Render (`render.yaml`, secrets set in the dashboard), frontend on Vercel with
`NEXT_PUBLIC_API_URL` pointing at the backend. The free backend sleeps; the UI shows "waking up".

## Data source and attribution

Case text and citations come from [Indian Kanoon](https://indiankanoon.org) (the "powered by IKanoon"
logo is shown unaltered above search results). The data is published as-is from government sources
with no accuracy warranty. CaseCompass is independent and is not endorsed by or affiliated with
Indian Kanoon. The version on Indian Kanoon and the issuing commission is the authoritative record.
