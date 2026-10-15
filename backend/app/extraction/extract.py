"""Outcome extraction: code first, LLM only for what code cannot read reliably.

Concept: we never send a whole judgment. Code trims it to the opening facts and the final
order (about 900 tokens), pulls cited laws with a regex, and asks a small model for a tiny
JSON: who won, refund, compensation, is-it-travel, one-line summary. Amounts the model
reports are checked against the text (a number that never appears in the order is dropped),
and a result of "unclear" escalates to the larger model rather than guessing.
"""
import re

from pydantic import BaseModel, Field, field_validator

from app.chunking.chunker import chunk_judgment
from app.llm.cascade import run_cascade
from app.llm.provider import LLMProvider

# Bump when the prompt, trimming or rules change; stored per case so reruns can target old rows.
EXTRACTION_VERSION = "v2"
FACTS_CHARS = 1200
ORDER_CHARS = 2400

SYSTEM = (
    "You read an Indian consumer commission judgment excerpt (facts, then final order). "
    'Return JSON only: {"r":"allowed|partly_allowed|dismissed|unclear",'
    '"ref":<refund INR number or null>,"comp":<compensation+costs INR number or null>,'
    '"rel":<true if about airline/air travel/travel agent/tour/ticket refund else false>,'
    '"s":"<one factual sentence under 40 words>"}. '
    "Judge the COMPLAINANT's position: complaint/award in the complainant's favour = allowed "
    "(also when the opposite party's appeal is dismissed); opposite party's appeal allowed and "
    "complaint dismissed = dismissed. "
    "Use null when an amount is not stated; use unclear when the outcome is not stated."
)


class Extracted(BaseModel):
    r: str
    ref: float | None = None
    comp: float | None = None
    rel: bool = True
    s: str = Field(default="", max_length=400)

    @field_validator("r")
    @classmethod
    def _enum(cls, v):
        if v not in {"allowed", "partly_allowed", "dismissed", "unclear"}:
            raise ValueError("bad result enum")
        return v


# "Section 14 of the Consumer Protection Act, 1986" / "Sections 12 & 13 of the ... Act"
_LAW = re.compile(
    r"[Ss]ections?\s+(\d+[A-Za-z]?(?:\(\w+\))*)(?:\s*(?:,|and|&|/)\s*\d+[A-Za-z]?)*\s+of\s+(?:the\s+)?"
    r"((?:[A-Z][\w&.\-]*\s+){1,6}Act(?:,?\s*\d{4})?)")


_ACT = re.compile(r"((?:[A-Z][\w&.\-]*\s+){1,6}Act(?:,?\s*\d{4})?)")


def laws_cited(text: str, limit=8) -> list[str]:
    """Section-level citations first ("s.15 Consumer Protection Act, 1986"), then any other
    Acts mentioned by name. Pure regex: no LLM tokens spent on this."""
    out: list[str] = []
    for sec, act in _LAW.findall(text):
        item = f"s.{sec} {re.sub(r'\s+', ' ', act).strip()}"
        if item not in out:
            out.append(item)
    named = [re.sub(r"\s+", " ", a).strip() for a in _ACT.findall(text)]
    for a in dict.fromkeys(named):  # unique, in order of appearance
        if not any(a in o for o in out) and not a.startswith(("The Act", "This Act")):
            out.append(a)
    return out[:limit]


def trim_for_llm(text: str) -> tuple[str, bool]:
    """Opening facts + final order only. Returns (excerpt, was_truncated)."""
    chunks = chunk_judgment(text)
    facts = next((c.text for c in chunks if c.section == "facts"), text[:FACTS_CHARS])
    order = "\n".join(c.text for c in chunks if c.section == "order") or text[-ORDER_CHARS:]
    cut = len(facts) > FACTS_CHARS or len(order) > ORDER_CHARS
    return f"FACTS:\n{facts[:FACTS_CHARS]}\n\nORDER:\n{order[-ORDER_CHARS:]}", cut


def _amount_in_text(x: float | None, text: str) -> bool:
    """Guard against hallucinated money: the number must literally appear in the excerpt,
    either as digits (1,00,000) or in lakh form (1.5 lakhs)."""
    if x is None:
        return True
    if str(int(x)) in re.sub(r"[,\s]", "", text):
        return True
    lakhs = {float(v) for v in re.findall(r"(\d+(?:\.\d+)?)\s*lakhs?", text, re.IGNORECASE)}
    return any(abs(v * 100000 - x) < 1 for v in lakhs)


async def extract_case(llm: LLMProvider, text: str):
    """Returns (Extracted | None, model_used, escalated, truncated, laws)."""
    excerpt, cut = trim_for_llm(text)
    obj, model, esc = await run_cascade(
        llm, SYSTEM, excerpt, Extracted.model_validate_json, max_tokens=500, stage="extract",
        is_unclear=lambda o: o.r == "unclear")
    if obj:
        if not _amount_in_text(obj.ref, excerpt):
            obj.ref = None
        if not _amount_in_text(obj.comp, excerpt):
            obj.comp = None
    return obj, model, esc, cut, laws_cited(text)


_COMPLAINT_DISMISSED = re.compile(
    r"complaints?\b(?:(?!against|appeal)[^.]){0,90}\b(?:is|are|stands?|shall stand|ordered to be|"
    r"hereby)\s+(?:hereby\s+)?dismissed", re.IGNORECASE)
_PARTLY = re.compile(r"partly allowed|partially allowed|allowed partly|allowed in part", re.IGNORECASE)


_APPEAL_DISMISSED = re.compile(r"appeals?\b[^.]{0,80}dismiss|dismiss[^.]{0,60}appeals?\b", re.IGNORECASE)
# Signs that the appellant was the OPPOSITE party (the airline/agent): it furnished a bank
# guarantee/FDR or statutory deposit, or the order names the appellant as opposite party.
_OP_APPELLANT = re.compile(
    r"bank guarantee|\bFDR\b|statutory (?:deposit|amount)|deposited (?:by the appellant )?at the time of filing|"
    r"appellants?\s*/\s*(?:opposite|O\.?P)|opposite part(?:y|ies)\s*/\s*appellants?|"
    r"appellants?[^.]{0,25}opposite part", re.IGNORECASE)


def op_appeal_dismissed(text: str) -> bool:
    """True when the final order dismisses an appeal that the opposite party (not the
    complainant) filed: the complainant's award then stands, so the result is 'allowed'."""
    tail = text[-3500:]
    return bool(_APPEAL_DISMISSED.search(tail) and _OP_APPELLANT.search(tail)
                and not _COMPLAINT_DISMISSED.search(tail))


def rule_override(text: str) -> str | None:
    """Code check on the final order: wording that settles the outcome without the LLM.
    Fixes the LLM's weak spot (who appealed?): "complaint ... dismissed" means the complainant
    lost, whoever filed the appeal. Returns a result enum or None to keep the LLM's answer."""
    tail = text[-2000:]
    if _PARTLY.search(tail):
        return "partly_allowed"
    if _COMPLAINT_DISMISSED.search(tail):
        return "dismissed"
    return None


# ---- amounts read by code from the final order (no LLM) ------------------------------------
_AMT = re.compile(
    r"(?:Rs\.?|INR|₹|`)\s*([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?|/-)?|"
    r"([\d,]+(?:\.\d+)?)\s*(lakhs?|lacs?)\b", re.IGNORECASE)
_REFUND_WORDS = re.compile(r"refund|ticket (?:amount|price|cost)|fare|amount paid|paid by the complainant",
                           re.IGNORECASE)
_COMP_WORDS = re.compile(r"compensat|damages|mental|agony|harass|litigation|costs?\b|deficiency",
                         re.IGNORECASE)


def _to_inr(num: str, unit: str | None) -> float | None:
    try:
        v = float(num.replace(",", ""))
    except ValueError:
        return None
    if unit and unit.lower().startswith(("lakh", "lac")):
        v *= 100000
    return v if v >= 100 else None  # ignore stray small numbers (section numbers, percents)


def amounts_from_order(text: str, result: str | None = None) -> tuple[float | None, float | None]:
    """(refund, compensation) the commission ORDERED, read by pattern, or None.

    Conservative on purpose (first version double counted amounts from the discussion and
    from the lower forum's order). Rules: only for allowed/partly_allowed outcomes; only the
    last ~1500 characters; only sentences with an ordering verb (directed, shall pay, allow,
    ordered); each distinct amount counted once; sentences about refund/fare feed the refund,
    those about compensation/damages/costs feed compensation; mixed sentences are skipped."""
    if result in ("dismissed", "unclear"):
        return None, None
    tail = text[-1500:]
    refund, comp = set(), set()
    for sent in re.split(r"(?<=[.;])(?<!Rs\.)\s+(?=[A-Z0-9(])", tail):
        if re.search(r"enhanc|reduc|instead of|in place of", sent, re.IGNORECASE):
            continue  # recital of a change to the lower forum's sum, not the sum ordered
        if not re.search(r"direct|shall pay|to pay|pay|ordered|allow|deem|award|lump ?sum", sent, re.IGNORECASE):
            continue
        amts = [a for m in _AMT.finditer(sent)
                if (a := _to_inr(m.group(1) or m.group(3), m.group(2) or m.group(4)))]
        is_ref, is_comp = bool(_REFUND_WORDS.search(sent)), bool(_COMP_WORDS.search(sent))
        if is_ref and not is_comp:
            refund.update(amts[:1])
        elif is_comp and not is_ref:
            comp.update(amts)
    return (max(refund) if refund else None), (sum(comp) if comp else None)
