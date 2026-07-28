import pytest

from autodraftman_backend.core.config import Settings
from autodraftman_backend.modules.identity.oauth import (
    OAuthFlowError,
    append_auth_result,
    provider_enabled,
    validate_return_url,
)


def oauth_settings(**overrides) -> Settings:
    return Settings(
        _env_file=None,
        cors_origins="http://127.0.0.1:5173,https://autodraftman.peanut-ai.dev",
        frontend_url="http://127.0.0.1:5173",
        oauth_google_client_id="google-id",
        oauth_google_client_secret="google-secret",
        **overrides,
    )


def test_provider_is_enabled_only_with_complete_credentials() -> None:
    settings = oauth_settings()

    assert provider_enabled("google", settings)
    assert not provider_enabled("github", settings)
    assert not provider_enabled("wechat", settings)


def test_return_url_must_use_an_allowed_frontend_origin() -> None:
    settings = oauth_settings()

    assert (
        validate_return_url(
            "https://autodraftman.peanut-ai.dev/workspace?mode=text#ignored",
            settings,
        )
        == "https://autodraftman.peanut-ai.dev/workspace?mode=text"
    )
    with pytest.raises(OAuthFlowError, match="not allowed"):
        validate_return_url("https://attacker.example/callback", settings)


def test_auth_result_preserves_existing_query_parameters() -> None:
    result = append_auth_result(
        "https://autodraftman.peanut-ai.dev/workspace?mode=text",
        provider="google",
    )

    assert "mode=text" in result
    assert "auth=success" in result
    assert "provider=google" in result
