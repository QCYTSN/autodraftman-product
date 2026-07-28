from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_prefix="AUTODRAFTMAN_",
        extra="ignore",
    )

    app_name: str = "AutoDraftman API"
    environment: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+asyncpg://autodraftman:autodraftman@localhost:5432/autodraftman"
    database_pool_size: int = 10
    database_max_overflow: int = 20
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "https://qcytsn.github.io"
    )

    guest_cookie_name: str = "autodraftman_guest"
    guest_ttl_days: int = 7
    guest_content_ttl_days: int = 7
    guest_initial_credits: int = 1
    session_cookie_name: str = "autodraftman_session"
    session_ttl_days: int = 30
    asset_delete_grace_hours: int = 24
    account_purge_days: int = 30
    backup_retention_days: int = 30
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    oauth_attempt_ttl_minutes: int = 10
    frontend_url: str = "http://127.0.0.1:5173"
    public_api_url: str | None = None
    oauth_google_client_id: str | None = None
    oauth_google_client_secret: str | None = None
    oauth_github_client_id: str | None = None
    oauth_github_client_secret: str | None = None

    asset_max_upload_bytes: int = 10 * 1024 * 1024
    asset_max_pixels: int = 40_000_000
    allowed_image_media_types: str = "image/png,image/jpeg,image/webp"

    s3_endpoint_url: str | None = None
    s3_public_endpoint_url: str | None = None
    s3_region: str | None = None
    s3_bucket: str = "autodraftman"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_presign_ttl_seconds: int = 600

    @field_validator("database_url")
    @classmethod
    def require_postgresql(cls, value: str) -> str:
        if not value.startswith(("postgresql://", "postgresql+asyncpg://")):
            raise ValueError("AutoDraftman requires PostgreSQL; SQLite is not supported.")
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production_cookie(self) -> Settings:
        if self.environment == "production" and not self.cookie_secure:
            raise ValueError("Secure cookies are required in production.")
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None cookies must also be Secure.")
        if self.guest_initial_credits < 0:
            raise ValueError("Guest initial credits cannot be negative.")
        if self.guest_ttl_days <= 0 or self.guest_content_ttl_days <= 0:
            raise ValueError("Guest identity and content TTLs must be positive.")
        if self.session_ttl_days <= 0:
            raise ValueError("Session TTL must be positive.")
        if self.asset_delete_grace_hours <= 0:
            raise ValueError("Asset deletion grace period must be positive.")
        if self.account_purge_days <= 0 or self.backup_retention_days <= 0:
            raise ValueError("Account and backup retention periods must be positive.")
        if self.oauth_attempt_ttl_minutes <= 0:
            raise ValueError("OAuth attempt TTL must be positive.")
        if self.asset_max_upload_bytes <= 0 or self.asset_max_pixels <= 0:
            raise ValueError("Asset upload limits must be positive.")
        self._validate_oauth_pair(
            "Google",
            self.oauth_google_client_id,
            self.oauth_google_client_secret,
        )
        self._validate_oauth_pair(
            "GitHub",
            self.oauth_github_client_id,
            self.oauth_github_client_secret,
        )
        return self

    @staticmethod
    def _validate_oauth_pair(
        provider: str,
        client_id: str | None,
        client_secret: str | None,
    ) -> None:
        if bool(client_id) != bool(client_secret):
            raise ValueError(f"{provider} OAuth client ID and secret must be configured together.")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_image_media_type_set(self) -> frozenset[str]:
        return frozenset(
            media_type.strip()
            for media_type in self.allowed_image_media_types.split(",")
            if media_type.strip()
        )

    @property
    def guest_ttl_seconds(self) -> int:
        return self.guest_ttl_days * 24 * 60 * 60

    @property
    def session_ttl_seconds(self) -> int:
        return self.session_ttl_days * 24 * 60 * 60

    def oauth_provider_enabled(self, provider: str) -> bool:
        if provider == "google":
            return bool(self.oauth_google_client_id and self.oauth_google_client_secret)
        if provider == "github":
            return bool(self.oauth_github_client_id and self.oauth_github_client_secret)
        return False


@lru_cache
def get_settings() -> Settings:
    return Settings()
