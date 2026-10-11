"""Citation graph (plain edge table + networkx, no graph database).

Concepts:
- An edge A -> B means "case A cites document B" (from Indian Kanoon's cite links).
- "Most cited": documents many of our cases rely on are the leading authorities.
- Expansion: if the search finds case X, cases that share precedents with X (co-citation) or
  cite/are cited by X directly are probably about the same legal question, even when their
  wording differs, so we add them as "related cases".
"""
from collections import Counter

import networkx as nx
import psycopg


def load_graph(conn: psycopg.Connection) -> nx.DiGraph:
    g = nx.DiGraph()
    g.add_edges_from(conn.execute("select from_tid, to_tid from citations").fetchall())
    return g


def most_cited(g: nx.DiGraph, corpus: set[int] | None = None, n=10) -> list[tuple[int, int]]:
    """(doc id, number of corpus cases citing it). Restrict to corpus docs if given."""
    items = [(t, d) for t, d in g.in_degree() if d > 0 and (corpus is None or t in corpus)]
    return sorted(items, key=lambda x: -x[1])[:n]


def expand(g: nx.DiGraph, seeds: list[int], corpus: set[int], k=5) -> list[int]:
    """Corpus cases related to the seeds through direct links or shared cited authorities,
    ranked by how many links they share with the seeds. Seeds themselves are excluded."""
    score: Counter = Counter()
    for s in seeds:
        if s not in g:
            continue
        for nb in set(g.successors(s)) | set(g.predecessors(s)):  # direct links
            if nb in corpus and nb not in seeds:
                score[nb] += 2
        for cited in g.successors(s):  # co-citation: other cases citing the same authority
            for other in g.predecessors(cited):
                if other != s and other in corpus and other not in seeds:
                    score[other] += 1
    return [t for t, _ in score.most_common(k)]
