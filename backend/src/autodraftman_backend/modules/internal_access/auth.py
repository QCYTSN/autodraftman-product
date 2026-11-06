from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, SecretStr
from sqlalchemy import case, delete, select
from sqlalchemy.dialects.postgresql import insert
from starlette.concurrency import run_in_threadpool

from autodraftman_backend.api.dependencies import (
    SessionDependency,
    SettingsDependency,
    UserPrincipalDependency,
    clear_guest_cookie,
    set_user_session_cookie,
)
from autodraftman_backend.modules.identity.models import User
from autodraftman_backend.modules.identity.service import (
    Principal,
    create_user_session,
    revoke_user_session,
)
from autodraftman_backend.modules.internal_access.models import InternalAccount, LoginThrottle
from autodraftman_backend.modules.internal_access.passwords import DUMMY_HASH, verify_password

router = APIRouter(tags=["internal access"])


def trusted_origin(request: Request, settings: SettingsDependency) -> None:
    # Cookies alone are not sufficient for multipart submissions or login CSRF.
    if request.headers.get("origin") not in settings.cors_origin_list:
        raise HTTPException(403, "Untrusted request origin")


class LoginInput(BaseModel):
    username: str = Field(min_length=1, max_length=32, pattern=r"^[a-zA-Z0-9_-]+$")
    password: SecretStr = Field(min_length=1, max_length=128)


async def throttle_login(request: Request, username: str, session: SessionDependency) -> None:
    now = datetime.now(UTC)
    cutoff = now - timedelta(minutes=15)
    address = request.client.host if request.client else "unknown"
    # Do not trust client-supplied X-Forwarded-For; proxy trust is set at the ASGI server.
    for scope, limit in ((f"account:{username}", 10), (f"address:{address}", 40)):
        key = hashlib.sha256(scope.encode()).hexdigest()
        expired = LoginThrottle.window_start < cutoff
        statement = insert(LoginThrottle).values(key=key, window_start=now, attempts=1)
        count = await session.scalar(
            statement.on_conflict_do_update(
                index_elements=[LoginThrottle.key],
                set_={
                    "attempts": case((expired, 1), else_=LoginThrottle.attempts + 1),
                    "window_start": case((expired, now), else_=LoginThrottle.window_start),
                },
            ).returning(LoginThrottle.attempts)
        )
        if count and count > limit:
            await session.commit()
            raise HTTPException(
                429, "尝试次数较多，请 15 分钟后再试。", headers={"Retry-After": "900"}
            )
    await session.execute(delete(LoginThrottle).where(LoginThrottle.window_start < cutoff))
    await session.commit()


@router.post("/auth/password", dependencies=[Depends(trusted_origin)])
async def password_login(
    body: LoginInput,
    request: Request,
    response: Response,
    settings: SettingsDependency,
    session: SessionDependency,
) -> dict:
    if not settings.internal_accounts_enabled:
        raise HTTPException(404, "Internal sign-in is unavailable")
    username = body.username.lower()
    await throttle_login(request, username, session)
    row = (
        await session.execute(
            select(InternalAccount, User)
            .join(User, User.id == InternalAccount.user_id)
            .where(InternalAccount.username == username)
            .with_for_update()
        )
    ).first()
    valid = await run_in_threadpool(
        verify_password,
        body.password.get_secret_value(),
        row[0].password_hash if row else DUMMY_HASH,
    )
    if not valid or row is None or not row[0].enabled or not row[1].is_active:
        raise HTTPException(401, "账号或密码不正确。")
    now = datetime.now(UTC)
    await revoke_user_session(session, request.cookies.get(settings.session_cookie_name), now)
    token, _ = await create_user_session(session, row[1].id, settings, now)
    await session.commit()
    set_user_session_cookie(response, settings, token)
    clear_guest_cookie(response, settings)
    response.headers["Cache-Control"] = "no-store"
    return {"signed_in": True}


async def require_generation_account(
    principal: UserPrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> Principal:
    if not settings.internal_accounts_enabled or not settings.reconstruction_gateway_enabled:
        raise HTTPException(503, "重建服务尚未开放。")
    account = await session.get(InternalAccount, principal.subject_id)
    if not account or not account.enabled or not account.generation_allowed:
        raise HTTPException(403, "当前账号尚未获得内测重建权限。")
    return principal


GenerationPrincipal = Annotated[Principal, Depends(require_generation_account)]
