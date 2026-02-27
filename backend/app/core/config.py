"""Application settings and environment loading."""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Multi-Agent Research Reporter"
    api_prefix: str = "/api"
    app_env: str = "development"

    groq_api_key: str = Field("", description="Groq API key")
    tavily_api_key: str = Field("", description="Tavily API key")
    groq_model: str = "llama-3.3-70b-versatile"

    max_iterations: int = 3
    min_quality_score: int = 7
    tavily_max_results: int = 5

    cors_origins: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost",
            "http://127.0.0.1",
        ]
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: str | List[str]) -> List[str]:
        import json as _json

        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                try:
                    parsed = _json.loads(stripped)
                    if isinstance(parsed, list):
                        return [str(o).strip() for o in parsed if str(o).strip()]
                except _json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        raise ValueError("cors_origins must be a list or comma-separated string")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cache settings object once per process."""
    return Settings()
