"""Usage ledger: one row per external call, plus Jina free-pool guard (warn 70%, stop 90%)."""
import logging

from app.config import settings
from app.db import connect

log = logging.getLogger("usage")


class JinaPoolExhausted(Exception):
    """Raised when the Jina free pool passes the hard-stop fraction; callers fall back."""


def _conn():
    return connect()


def log_usage(service, model, stage, tokens_in=0, tokens_out=0, cost_inr=0.0, cached=False,
              note=None):
    with _conn() as c:
        c.execute(
            "insert into usage_log(service,model,stage,tokens_in,tokens_out,cost_inr,cached,note)"
            " values(%s,%s,%s,%s,%s,%s,%s,%s)",
            (service, model, stage, tokens_in, tokens_out, cost_inr, cached, note))


def jina_used() -> int:
    with _conn() as c:
        return c.execute(
            "select coalesce(sum(tokens_in),0) from usage_log where service='jina' and not cached"
        ).fetchone()[0]


def check_jina_pool(extra: int = 0) -> float:
    """Return fraction of the pool used; raise if the hard stop would be passed."""
    frac = (jina_used() + extra) / settings.jina_pool_tokens
    if frac >= settings.jina_stop_fraction:
        raise JinaPoolExhausted(f"Jina pool at {frac:.0%}; hard stop at "
                                f"{settings.jina_stop_fraction:.0%}")
    if frac >= settings.jina_warn_fraction:
        log.warning("Jina pool at %.0f%% of the free allowance", frac * 100)
    return frac
