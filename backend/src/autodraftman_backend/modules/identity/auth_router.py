from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from autodraftman_backend.api.dependencies import (
    OptionalPrincipalDependency,
    SessionDependency,
    SettingsDependency,
    UserPrincipalDependency,
    clear_guest_cookie,
    clear_user_session_cookie,
    set_user_session_cookie,
)
from autodraftman_backend.modules.identity.oauth import (
    OAuthFlowError,
    OAuthProviderError,
    append_auth_result,
    complete_oauth_attempt,
    consume_denied_attempt,
    create_oauth_attempt,
    exchange_code_for_profile,
    get_valid_attempt,
    provider_enabled,
    validate_provider,
)
from autodraftman_backend.modules.identity.schemas import (
    AuthProvidersResponse,
    AuthProviderStatus,
    BoundIdentitiesResponse,
    BoundIdentityResponse,
)
from autodraftman_backend.modules.identity.service import (
    IdentityConflictError,
    LastIdentityError,
    list_bound_identities,
    revoke_user_session,
    unlink_identity,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _http_error(exc: OAuthFlowError, status_code: int = status.HTTP_400_BAD_REQUEST):
    return HTTPException(status_code=status_code, detail=str(exc))


@router.get("/providers", response_model=AuthProvidersResponse)
async def providers(settings: SettingsDependency) -> AuthProvidersResponse:
    return AuthProvidersResponse(
        providers=[
            AuthProviderStatus(
                id="google",
                name="Google",
                enabled=provider_enabled("google", settings),
            ),
            AuthProviderStatus(
                id="github",
                name="GitHub",
                enabled=provider_enabled("github", settings),
            ),
            AuthProviderStatus(
                id="wechat",
                name="WeChat",
                enabled=False,
            ),
        ]
    )


@router.get("/oauth/{provider}/start", name="oauth_start")
async def oauth_start(
    provider: str,
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
    principal: OptionalPrincipalDependency,
    mode: Literal["login", "link"] = Query(default="login"),
    return_url: str | None = Query(default=None),
) -> RedirectResponse:
    try:
        validated_provider = validate_provider(provider)
        redirect_uri = (
            f"{settings.public_api_url.rstrip('/')}"
            f"/api/v1/auth/oauth/{validated_provider}/callback"
            if settings.public_api_url
            else str(request.url_for("oauth_callback", provider=validated_provider))
        )
        start = await create_oauth_attempt(
            session,
            provider=validated_provider,
            mode=mode,
            principal=principal,
            redirect_uri=redirect_uri,
            return_url=return_url,
            settings=settings,
        )
    except OAuthFlowError as exc:
        raise _http_error(exc) from exc
    return RedirectResponse(start.authorization_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/oauth/{provider}/callback", name="oauth_callback")
async def oauth_callback(
    provider: str,
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
    principal: OptionalPrincipalDependency,
    state_value: str | None = Query(default=None, alias="state"),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    if not state_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The OAuth state parameter is missing.",
        )
    return_url: str | None = None
    validated_provider: str | None = None
    try:
        validated_provider = validate_provider(provider)
        if error:
            return_url = await consume_denied_attempt(
                session,
                provider=validated_provider,
                state=state_value,
            )
            return RedirectResponse(
                append_auth_result(
                    return_url,
                    provider=validated_provider,
                    error="authorization_cancelled",
                ),
                status_code=status.HTTP_303_SEE_OTHER,
            )
        if not code:
            raise OAuthFlowError("The authorization code is missing.")

        attempt = await get_valid_attempt(
            session,
            provider=validated_provider,
            state=state_value,
        )
        return_url = attempt.return_url
        profile = await exchange_code_for_profile(
            provider=validated_provider,
            code=code,
            verifier=attempt.code_verifier,
            redirect_uri=attempt.redirect_uri,
            settings=settings,
        )
        completion = await complete_oauth_attempt(
            session,
            provider=validated_provider,
            state=state_value,
            profile=profile,
            principal=principal,
            raw_session_token=request.cookies.get(settings.session_cookie_name),
            settings=settings,
        )
    except IdentityConflictError as exc:
        if return_url and validated_provider:
            await consume_denied_attempt(
                session,
                provider=validated_provider,
                state=state_value,
            )
            return RedirectResponse(
                append_auth_result(
                    return_url,
                    provider=validated_provider,
                    error="identity_conflict",
                ),
                status_code=status.HTTP_303_SEE_OTHER,
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except OAuthProviderError as exc:
        if return_url and validated_provider:
            await consume_denied_attempt(
                session,
                provider=validated_provider,
                state=state_value,
            )
            return RedirectResponse(
                append_auth_result(
                    return_url,
                    provider=validated_provider,
                    error="provider_unavailable",
                ),
                status_code=status.HTTP_303_SEE_OTHER,
            )
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except OAuthFlowError as exc:
        raise _http_error(exc) from exc

    response = RedirectResponse(
        append_auth_result(
            completion.return_url,
            provider=completion.provider,
        ),
        status_code=status.HTTP_303_SEE_OTHER,
    )
    set_user_session_cookie(response, settings, completion.raw_session_token)
    clear_guest_cookie(response, settings)
    return response


@router.get("/identities", response_model=BoundIdentitiesResponse)
async def identities(
    principal: UserPrincipalDependency,
    session: SessionDependency,
) -> BoundIdentitiesResponse:
    bound = await list_bound_identities(session, principal.subject_id)
    return BoundIdentitiesResponse(
        identities=[
            BoundIdentityResponse(
                provider=item.provider,
                email=item.email,
                email_verified=item.email_verified,
                created_at=item.created_at,
            )
            for item in bound
        ]
    )


@router.delete("/identities/{provider}", status_code=status.HTTP_204_NO_CONTENT)
async def unlink(
    provider: str,
    principal: UserPrincipalDependency,
    session: SessionDependency,
) -> Response:
    try:
        validated_provider = validate_provider(provider)
        await unlink_identity(session, principal.subject_id, validated_provider)
        await session.commit()
    except LastIdentityError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except OAuthFlowError as exc:
        raise _http_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
) -> Response:
    await revoke_user_session(
        session,
        request.cookies.get(settings.session_cookie_name),
        now=datetime.now(UTC),
    )
    await session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_user_session_cookie(response, settings)
    return response
