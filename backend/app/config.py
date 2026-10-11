"""App settings, loaded from the repo-root .env (backend only; never exposed to the frontend)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    ik_base_url: str = "https://api.indiankanoon.org"
    ik_api_token: str = ""
    # Stop calling IK when our own tracked spend would pass this (INR). Free credit is 500.
    ik_spend_cap_inr: float = 150.0
    cache_dir: str = "data/cache"

    @property
    def cache_path(self) -> Path:
        p = Path(self.cache_dir)
        return p if p.is_absolute() else ROOT / p


settings = Settings()
