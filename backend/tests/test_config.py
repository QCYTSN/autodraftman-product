import pytest
from pydantic import ValidationError

from autodraftman_backend.core.config import Settings


def test_sqlite_is_rejected() -> None:
    with pytest.raises(ValidationError, match="PostgreSQL"):
        Settings(_env_file=None, database_url="sqlite:///autodraftman.db")


def test_plain_postgres_url_is_normalized_for_asyncpg() -> None:
    settings = Settings(
        _env_file=None,
        database_url="postgresql://user:password@localhost/autodraftman",
    )

    assert settings.database_url.startswith("postgresql+asyncpg://")


def test_production_requires_secure_cookie() -> None:
    with pytest.raises(ValidationError, match="Secure cookies"):
        Settings(
            _env_file=None,
            environment="production",
            cookie_secure=False,
        )


def test_oauth_credentials_must_be_configured_as_a_pair() -> None:
    with pytest.raises(ValidationError, match="Google OAuth"):
        Settings(
            _env_file=None,
            oauth_google_client_id="client-id",
            oauth_google_client_secret=None,
        )


def test_samesite_none_requires_secure_cookie() -> None:
    with pytest.raises(ValidationError, match="SameSite=None"):
        Settings(
            _env_file=None,
            cookie_samesite="none",
            cookie_secure=False,
        )


def test_retention_periods_must_be_positive() -> None:
    with pytest.raises(ValidationError, match="retention"):
        Settings(
            _env_file=None,
            backup_retention_days=0,
        )
