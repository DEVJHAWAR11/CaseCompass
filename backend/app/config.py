"""App settings, loaded from the repo-root .env (backend only; never exposed to the frontend)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    ik_base_url: str = "https://api.indiankanoon.org"
    ik_api_token: str = ""
    # Stop calling IK when our own tracked spend would pass this (INR). Free credit is 500.
    ik_spend_cap_inr: float = 100.0
    cache_dir: str = "data/cache"
    database_url: str = ""
    rate_limit_per_min: int = 10
    cors_origins: str = "http://localhost:3000"

    # --- Groq LLM (OpenAI-compatible). Small model first, larger one only on failure/"unclear".
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"
    llm_small_model: str = "openai/gpt-oss-20b"
    llm_large_model: str = "openai/gpt-oss-120b"
    llm_daily_token_budget: int = 400_000
    llm_min_interval_s: float = 2.2  # request throttle for the free tier's requests/min
    llm_max_calls_per_request: int = 3

    # --- Jina (embeddings + rerank). Free key: non-commercial only, 10M shared token pool.
    jina_api_key: str = ""
    embed_model: str = "jina-embeddings-v3"
    embed_dim: int = 1024
    rerank_model: str = "jina-reranker-v2-base-multilingual"
    jina_pool_tokens: int = 10_000_000
    jina_warn_fraction: float = 0.70
    jina_stop_fraction: float = 0.90
    jina_max_req_per_min: int = 100
    jina_max_tokens_per_min: int = 100_000

    @property
    def cache_path(self) -> Path:
        p = Path(self.cache_dir)
        return p if p.is_absolute() else ROOT / p


settings = Settings()
