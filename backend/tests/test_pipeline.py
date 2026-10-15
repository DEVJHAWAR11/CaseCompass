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
