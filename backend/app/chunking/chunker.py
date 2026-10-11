"""Structure-aware chunking of a judgment.

Concept: instead of cutting text every N characters, we first find the parts of the judgment
(facts / issues / order) and cut inside those parts. Facts+order carry the "what happened and
who won" signal; boilerplate (case law quotes, arguments) is skipped to save embedding tokens.
Judgments here are mostly plain text in <pre> blocks with no structural tags, so section
detection is done with heading regexes plus a positional fallback.
"""
import html
import re
from dataclasses import dataclass

MAX_CHARS = 1800  # about 450 tokens per chunk
KEEP = {"facts": 2, "issues": 1, "order": 2}  # how many chunks per section we embed

_HEAD = {
    "issues": re.compile(r"points? (for|of) (determination|consideration)|^issues?\b|"
                         r"questions? (for|of)", re.IGNORECASE),
    "order": re.compile(r"^(final |operative )?order\b|^in (the )?result\b|^accordingly\b|"
                        r"^we (therefore |accordingly )?(direct|order|allow|dismiss)|"
                        r"^(the )?(appeal|complaint|revision)\b.*\b(is|stands) (partly |partially )?"
                        r"(allowed|dismissed|disposed)", re.IGNORECASE),
    "reasoning": re.compile(r"^(discussion|findings?|reasons?|observations?|held|conclusion|"
                            r"we have (heard|perused|considered)|having heard|heard|"
                            r"consideration)\b", re.IGNORECASE),
    "facts": re.compile(r"^(brief )?facts\b|^background\b|^the (case|complaint)\b|"
                        r"^(case of the )?complainant", re.IGNORECASE),
}


def clean_text(raw: str) -> str:
    """Deterministic HTML -> text. Offsets used elsewhere are relative to this exact output."""
    t = re.sub(r"<[^>]+>", "", raw or "")
    t = html.unescape(t).replace("\r", "")
    return re.sub(r"[ \t]+", " ", t).strip()


@dataclass
class Chunk:
    section: str
    idx: int
    start: int
    end: int
    text: str  # in memory only; never persisted


def _paragraphs(text: str):
    return [(m.start(), m.end()) for m in re.finditer(r"\S[\s\S]*?(?=\n\s*\n|\Z)", text)]


def _label(para: str):
    head = para.strip()[:140]
    for sec in ("issues", "order", "reasoning", "facts"):
        if _HEAD[sec].search(head):
            return sec
    return None


def chunk_judgment(text: str) -> list[Chunk]:
    paras = _paragraphs(text)
    if not paras:
        return []
    labels, cur = [], "facts"
    for s, e in paras:
        cur = _label(text[s:e]) or cur
        labels.append(cur)
    # Order = from the last paragraph that is clearly an order heading; fallback last 15%.
    cut = next((i for i in range(len(paras) - 1, -1, -1)
                if _label(text[paras[i][0]:paras[i][1]]) == "order"), None)
    if cut is None:
        cut = int(len(paras) * 0.85)
    labels = [("order" if i >= cut else lab) for i, lab in enumerate(labels)]

    # Pack consecutive same-section paragraphs into pieces of at most MAX_CHARS.
    pieces: list[list] = []  # [section, start, end]
    for (s, e), lab in zip(paras, labels):
        while e - s > MAX_CHARS:  # very long paragraph: hard split
            pieces.append([lab, s, s + MAX_CHARS])
            s += MAX_CHARS
        if pieces and pieces[-1][0] == lab and e - pieces[-1][1] <= MAX_CHARS:
            pieces[-1][2] = e
        else:
            pieces.append([lab, s, e])

    # Keep only the useful chunks: first N facts, first issues, last N order chunks.
    by: dict[str, list] = {}
    for p in pieces:
        by.setdefault(p[0], []).append(p)
    chosen = (by.get("facts", [])[: KEEP["facts"]] + by.get("issues", [])[: KEEP["issues"]]
              + by.get("order", [])[-KEEP["order"]:])
    chosen.sort(key=lambda p: p[1])
    return [Chunk(sec, i, s, e, text[s:e]) for i, (sec, s, e) in enumerate(chosen)]


def context_line(title: str, court: str, year, section: str) -> str:
    """Short header prepended before embedding so each chunk knows which case it came from."""
    return f"{title} | {court} | {year or 'n.d.'} | airline/travel refund dispute | {section}\n"
