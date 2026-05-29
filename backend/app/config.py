from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    backend_env: str = "development"
    backend_cors_origins: str = "http://127.0.0.1:8090"
    backend_secret_key: str
    access_token_ttl_minutes: int = 60 * 24 * 7

    database_url: str
    redis_url: str

    minio_endpoint: str
    minio_bucket: str
    minio_access_key: str
    minio_secret_key: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
