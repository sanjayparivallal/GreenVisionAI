from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Vision Cloud Inference
    vision_key: str = ""
    vision_api_key: str = ""
    gemini_api_key: str = ""

    # Local model inference (set to true to use greenvision.pt instead of cloud API)
    use_local_model: bool = False

    # Supabase / Postgres
    supabase_url: str = ""
    supabase_key: str = ""
    database_url: str = ""  # asyncpg DSN, e.g. postgresql://user:pass@host:5432/db

    # JWT
    jwt_secret: str
    jwt_refresh_secret: str
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 60
    jwt_refresh_expire_days: int = 30

    # App
    app_url: str = "http://localhost:8000"
    environment: str = "development"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
