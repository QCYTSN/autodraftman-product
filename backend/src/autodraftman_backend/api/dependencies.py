from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.core.config import Settings, get_settings
from autodraftman_backend.core.database import get_session
from autodraftman_backend.modules.identity.service import (
    Principal,
    resolve_or_create_guest,
    resolve_principal,
)

SettingsDependency = Annotated[Settings, Depends(get_settings)]
SessionDependency = Annotated[AsyncSession, Depends(get_session)]


def set_guest_cookie(
    response: Response,
    settings: Settings,
    token: str,
) -> None:
    response.set_cookie(
        key=settings.guest_cookie_name,
        value=token,
        max_age=settings.guest_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def set_user_session_cookie(
    response: Response,
    settings: Settings,
    token: str,
) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
    )


def clear_guest_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.guest_cookie_name,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        path="/",
    )


def clear_user_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.cookie_samesite,
        path="/",
    )


async def get_optional_principal(
    request: Request,
    session: SessionDependency,
    settings: SettingsDependency,
) -> Principal | None:
    return await resolve_principal(
        session=session,
        raw_guest_token=request.cookies.get(settings.guest_cookie_name),
        raw_session_token=request.cookies.get(settings.session_cookie_name),
        settings=settings,
    )


OptionalPrincipalDependency = Annotated[Principal | None, Depends(get_optional_principal)]


async def require_principal(principal: OptionalPrincipalDependency) -> Principal:
    if principal is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="An active session is required",
        )
    return principal


PrincipalDependency = Annotated[Principal, Depends(require_principal)]


async def require_user_principal(principal: PrincipalDependency) -> Principal:
    if principal.kind != "user":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A registered user session is required",
        )
    return principal


UserPrincipalDependency = Annotated[Principal, Depends(require_user_principal)]


async def get_or_create_guest_principal(
    request: Request,
    response: Response,
    session: SessionDependency,
    settings: SettingsDependency,
) -> Principal:
    principal, new_token = await resolve_or_create_guest(
        session=session,
        raw_guest_token=request.cookies.get(settings.guest_cookie_name),
        raw_session_token=request.cookies.get(settings.session_cookie_name),
        settings=settings,
    )
    if new_token is not None:
        set_guest_cookie(response, settings, new_token)
    return principal


GuestPrincipalDependency = Annotated[Principal, Depends(get_or_create_guest_principal)]
