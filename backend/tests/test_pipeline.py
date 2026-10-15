"""Unit tests for the pure-code parts: exact-lookup routing, stats, rank fusion, rule override."""
from app.extraction.extract import laws_cited, rule_override
from app.retrieval.pipeline import compute_stats, is_exact_lookup, summary_line
from app.retrieval.search import rrf


def _case(result, comp=None, refund=None):
    return {"result": result, "compensation_inr": comp, "refund_inr": refund}


def test_exact_lookup_detection():
    assert is_exact_lookup("FA/463/2018")
    assert is_exact_lookup("what does section 14 say")
    assert not is_exact_lookup("airline cancelled my flight and kept my money")


def test_stats_are_computed_from_fields():
    cases = [_case("allowed", 10000), _case("partly_allowed", 30000), _case("dismissed"),
             _case("unclear")]
    s = compute_stats(cases)
    assert (s["total"], s["favoured_complainant"], s["dismissed"]) == (4, 2, 1)
    assert s["median_compensation_inr"] == 20000
    assert "2 of 4" in summary_line(s)


def test_empty_stats():
    assert summary_line(compute_stats([])) == "No similar cases found."


def test_rrf_prefers_items_in_both_lists():
    fused = rrf([(1,), (2,), (3,)], [(3,), (4,)])
    assert fused[0] == 3


def test_rule_override_complaint_dismissed_vs_partly():
    assert rule_override("... the consumer complaint is hereby dismissed.") == "dismissed"
    assert rule_override("... the appeal is partly allowed.") == "partly_allowed"
    assert rule_override("... the complaint against opposite party no.2 is dismissed.") is None


def test_laws_regex_handles_nested_subsections():
    out = laws_cited("under Section 45(2)(g) of the Air Corporation Amendment Act, 1971")
    assert out and out[0].startswith("s.45(2)(g)")


def test_derived_text_uses_only_stored_fields():
    import datetime

    from app.retrieval.search import derived_text

    class Conn:
        def execute(self, *a, **k):
            class R:
                def fetchone(self):
                    return ("Air India vs X", "State Commission", datetime.date(2019, 5, 1),
                            "allowed", None, 12000, "Airline ordered to pay.", ["s.14 CPA"])
            return R()

    t = derived_text(Conn(), 1, "order")
    assert "Outcome: allowed" in t and "Compensation Rs 12,000" in t and "2019" in t


def test_db_text_store_falls_back_to_live_and_saves(monkeypatch):
    import asyncio

    from app import textstore

    saved = {}

    class FakeLive:
        async def get_text(self, tid):
            return "live text"

    store = textstore.DBTextStore.__new__(textstore.DBTextStore)
    store.live = FakeLive()
    monkeypatch.setattr(store, "_read", lambda tid: saved.get(tid))
    monkeypatch.setattr(store, "_write", lambda tid, t: saved.__setitem__(tid, t))
    monkeypatch.setattr(textstore.settings, "store_text", True)
    assert asyncio.run(store.get_text(7)) == "live text"  # miss -> live fetch, then saved
    assert saved == {7: "live text"}
    store.live = None  # second read must come from storage, never from IK
    assert asyncio.run(store.get_text(7)) == "live text"
