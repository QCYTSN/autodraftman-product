from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.core.config import Settings
from autodraftman_backend.core.security import (
    hash_opaque_token,
    new_opaque_token,
    new_pkce_verifier,
    pkce_challenge,
)
from autodraftman_backend.modules.identity.models import OAuthLoginAttempt
from autodraftman_backend.modules.identity.service import (
    ExternalIdentityProfile,
    IdentityConflictError,
    Principal,
    create_user_session,
    find_or_create_user_for_profile,
    grant_initial_user_allowance,
    merge_guest_into_user,
    revoke_user_session,
)

OAuthProviderName = Literal["google", "github"]
OAuthMode = Literal["login", "link"]
SUPPORTED_PROVIDERS: tuple[OAuthProviderName, ...] = ("google", "github")


class OAuthFlowError(Exception):
    pass


class OAuthProviderError(OAuthFlowError):
    pass


@dataclass(frozen=True, slots=True)
class OAuthStart:
    authorization_url: str
    state: str


@dataclass(frozen=True, slots=True)
class OAuthCompletion:
    raw_session_token: str
    return_url: str
    provider: str


def provider_display_name(provider: str) -> str:
    return {"google": "Google", "github": "GitHub"}.get(provider, provider.title())


def validate_provider(provider: str) -> OAuthProviderName:
    if provider not in SUPPORTED_PROVIDERS:
        raise OAuthFlowError("Unsupported login provider.")
    return provider


def provider_enabled(provider: str, settings: Settings) -> bool:
    return provider in SUPPORTED_PROVIDERS and settings.oauth_provider_enabled(provider)


def _origin(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def validate_return_url(return_url: str | None, settings: Settings) -> str:
    candidate = return_url or settings.frontend_url
    parsed = urlparse(candidate)
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username
        or parsed.password
    ):
        raise OAuthFlowError("Invalid OAuth return URL.")

    allowed_origins = {_origin(origin) for origin in settings.cors_origin_list}
    allowed_origins.add(_origin(settings.frontend_url))
    if _origin(candidate) not in allowed_origins:
        raise OAuthFlowError("OAuth return URL origin is not allowed.")

    return urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path or "/",
            "",
            parsed.query,
            "",
        )
    )


def append_auth_result(
    return_url: str,
    *,
    provider: str,
    error: str | None = None,
) -> str:
    parsed = urlparse(return_url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if error:
        query["auth_error"] = error
        query.pop("auth", None)
    else:
        query["auth"] = "success"
        query["provider"] = provider
        query.pop("auth_error", None)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _client_credentials(provider: OAuthProviderName, settings: Settings) -> tuple[str, str]:
    if provider == "google":
        client_id = settings.oauth_google_client_id
        client_secret = settings.oauth_google_client_secret
    else:
        client_id = settings.oauth_github_client_id
        client_secret = settings.oauth_github_client_secret
    if not client_id or not client_secret:
        raise OAuthFlowError(f"{provider_display_name(provider)} login is not configured.")
    return client_id, client_secret


def _authorization_url(
    provider: OAuthProviderName,
    *,
    settings: Settings,
    redirect_uri: str,
    state: str,
    verifier: str,
) -> str:
    client_id, _ = _client_credentials(provider, settings)
    common = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "code_challenge": pkce_challenge(verifier),
        "code_challenge_method": "S256",
    }
    if provider == "google":
        base = "https://accounts.google.com/o/oauth2/v2/auth"
        params = {
            **common,
            "response_type": "code",
            "scope": "openid email profile",
            "include_granted_scopes": "true",
            "prompt": "select_account",
        }
    else:
        base = "https://github.com/login/oauth/authorize"
        params = {
            **common,
            "scope": "read:user",
        }
    return f"{base}?{urlencode(params)}"


async def create_oauth_attempt(
    session: AsyncSession,
    *,
    provider: str,
    mode: OAuthMode,
    principal: Principal | None,
    redirect_uri: str,
    return_url: str | None,
    settings: Settings,
) -> OAuthStart:
    validated_provider = validate_provider(provider)
    if not provider_enabled(validated_provider, settings):
        raise OAuthFlowError(
            f"{provider_display_name(validated_provider)} login is not configured."
        )
    if mode == "link" and (principal is None or principal.kind != "user"):
        raise OAuthFlowError("Sign in before linking another login method.")
    if mode == "login" and principal is not None and principal.kind == "user":
        raise OAuthFlowError("Use account linking to add another login method.")

    state = new_opaque_token()
    verifier = new_pkce_verifier()
    now = datetime.now(UTC)
    attempt = OAuthLoginAttempt(
        state_hash=hash_opaque_token(state),
        provider=validated_provider,
        mode=mode,
        code_verifier=verifier,
        initiator_user_id=(
            principal.subject_id if principal is not None and principal.kind == "user" else None
        ),
        initiator_guest_id=(
            principal.subject_id if principal is not None and principal.kind == "guest" else None
        ),
        redirect_uri=redirect_uri,
        return_url=validate_return_url(return_url, settings),
        expires_at=now + timedelta(minutes=settings.oauth_attempt_ttl_minutes),
    )
    session.add(attempt)
    await session.commit()
    return OAuthStart(
        authorization_url=_authorization_url(
            validated_provider,
            settings=settings,
            redirect_uri=redirect_uri,
            state=state,
            verifier=verifier,
        ),
        state=state,
    )


async def _exchange_google(
    client: httpx.AsyncClient,
    *,
    code: str,
    verifier: str,
    redirect_uri: str,
    settings: Settings,
) -> ExternalIdentityProfile:
    client_id, client_secret = _client_credentials("google", settings)
    token_response = await client.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
    )
    if token_response.is_error:
        raise OAuthProviderError("Google rejected the authorization code.")
    access_token = token_response.json().get("access_token")
    if not access_token:
        raise OAuthProviderError("Google did not return an access token.")

    profile_response = await client.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    if profile_response.is_error:
        raise OAuthProviderError("Google profile lookup failed.")
    payload = profile_response.json()
    subject = payload.get("sub")
    if not subject:
        raise OAuthProviderError("Google profile is missing its subject identifier.")
    return ExternalIdentityProfile(
        provider="google",
        issuer="https://accounts.google.com",
        subject=str(subject),
        email=payload.get("email"),
        email_verified=bool(payload.get("email_verified", False)),
        display_name=payload.get("name"),
        avatar_url=payload.get("picture"),
    )


async def _exchange_github(
    client: httpx.AsyncClient,
    *,
    code: str,
    verifier: str,
    redirect_uri: str,
    settings: Settings,
) -> ExternalIdentityProfile:
    client_id, client_secret = _client_credentials("github", settings)
    token_response = await client.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": redirect_uri,
        },
    )
    if token_response.is_error:
        raise OAuthProviderError("GitHub rejected the authorization code.")
    access_token = token_response.json().get("access_token")
    if not access_token:
        raise OAuthProviderError("GitHub did not return an access token.")

    profile_response = await client.get(
        "https://api.github.com/user",
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {access_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    if profile_response.is_error:
        raise OAuthProviderError("GitHub profile lookup failed.")
    payload = profile_response.json()
    subject = payload.get("id")
    if subject is None:
        raise OAuthProviderError("GitHub profile is missing its subject identifier.")
    return ExternalIdentityProfile(
        provider="github",
        issuer="https://github.com",
        subject=str(subject),
        email=payload.get("email"),
        email_verified=False,
        display_name=payload.get("name") or payload.get("login"),
        avatar_url=payload.get("avatar_url"),
    )


async def exchange_code_for_profile(
    *,
    provider: str,
    code: str,
    verifier: str,
    redirect_uri: str,
    settings: Settings,
) -> ExternalIdentityProfile:
    validated_provider = validate_provider(provider)
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            if validated_provider == "google":
                return await _exchange_google(
                    client,
                    code=code,
                    verifier=verifier,
                    redirect_uri=redirect_uri,
                    settings=settings,
                )
            return await _exchange_github(
                client,
                code=code,
                verifier=verifier,
                redirect_uri=redirect_uri,
                settings=settings,
            )
    except httpx.HTTPError as exc:
        raise OAuthProviderError("The login provider could not be reached.") from exc


async def get_valid_attempt(
    session: AsyncSession,
    *,
    provider: str,
    state: str,
    lock: bool = False,
) -> OAuthLoginAttempt:
    statement = select(OAuthLoginAttempt).where(
        OAuthLoginAttempt.state_hash == hash_opaque_token(state),
        OAuthLoginAttempt.provider == provider,
    )
    if lock:
        statement = statement.with_for_update()
    attempt = await session.scalar(statement)
    now = datetime.now(UTC)
    if (
        attempt is None
        or attempt.consumed_at is not None
        or attempt.expires_at <= now
    ):
        raise OAuthFlowError("The login request is invalid or has expired.")
    return attempt


async def consume_denied_attempt(
    session: AsyncSession,
    *,
    provider: str,
    state: str,
) -> str:
    attempt = await get_valid_attempt(
        session,
        provider=provider,
        state=state,
        lock=True,
    )
    attempt.consumed_at = datetime.now(UTC)
    await session.commit()
    return attempt.return_url


async def complete_oauth_attempt(
    session: AsyncSession,
    *,
    provider: str,
    state: str,
    profile: ExternalIdentityProfile,
    principal: Principal | None,
    raw_session_token: str | None,
    settings: Settings,
) -> OAuthCompletion:
    attempt = await get_valid_attempt(
        session,
        provider=provider,
        state=state,
        lock=True,
    )
    now = datetime.now(UTC)

    if attempt.mode == "link":
        if (
            principal is None
            or principal.kind != "user"
            or principal.subject_id != attempt.initiator_user_id
        ):
            raise OAuthFlowError("The account-linking session has expired.")
        target_user_id = attempt.initiator_user_id
    else:
        target_user_id = None

    try:
        user, _ = await find_or_create_user_for_profile(
            session,
            profile,
            target_user_id=target_user_id,
        )
    except IdentityConflictError:
        await session.rollback()
        raise

    if attempt.mode == "login" and attempt.initiator_guest_id is not None:
        await merge_guest_into_user(session, attempt.initiator_guest_id, user, now)
    elif attempt.mode == "login":
        await grant_initial_user_allowance(session, user, settings, now)

    await revoke_user_session(session, raw_session_token, now)
    raw_token, _ = await create_user_session(session, user.id, settings, now)
    attempt.consumed_at = now
    await session.commit()
    return OAuthCompletion(
        raw_session_token=raw_token,
        return_url=attempt.return_url,
        provider=provider,
    )
