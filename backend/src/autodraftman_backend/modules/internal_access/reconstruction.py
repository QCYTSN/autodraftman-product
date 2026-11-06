"""Ownership gateway. The original local reconstruction service is left unchanged."""

from __future__ import annotations

import asyncio
import hashlib
import json
import re
import uuid
from datetime import UTC, datetime
from typing import Annotated, Literal

import httpx
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from autodraftman_backend.api.dependencies import SessionDependency, SettingsDependency
from autodraftman_backend.api.session_transport import session_token
from autodraftman_backend.core.config import Settings
from autodraftman_backend.core.security import hash_opaque_token
from autodraftman_backend.modules.identity.models import User, UserSession
from autodraftman_backend.modules.internal_access import budget
from autodraftman_backend.modules.internal_access.auth import (
    GenerationPrincipal,
    trusted_origin,
)
from autodraftman_backend.modules.internal_access.models import InternalAccount, OwnedReconstruction

router = APIRouter(prefix="/reconstructions", tags=["internal reconstruction"])


async def authorize_forward(session, principal, request, settings):
    # A queued request may have waited for another submission's row lock.
    token = session_token(request, settings)
    active = token and await session.scalar(
        select(UserSession.id)
        .join(User)
        .where(
            UserSession.user_id == principal.subject_id,
            UserSession.token_hash == hash_opaque_token(token),
            UserSession.revoked_at.is_(None),
            UserSession.expires_at > datetime.now(UTC),
            User.is_active.is_(True),
        )
    )
    if not active:
        raise HTTPException(401, "Sign in required")
    account = await session.get(InternalAccount, principal.subject_id, populate_existing=True)
    if not account or not account.enabled or not account.generation_allowed:
        raise HTTPException(403, "当前账号尚未获得内测重建权限。")


async def bridge(settings: Settings, method: str, path: str, **kwargs) -> httpx.Response:
    # No automatic retry, proxy environment, redirects, or browser cookies reach the kernel.
    try:
        async with httpx.AsyncClient(
            base_url=settings.reconstruction_bridge_url,
            trust_env=False,
            timeout=httpx.Timeout(40, connect=5),
            follow_redirects=False,
        ) as client:
            result = await client.request(method, f"/local-api{path}", **kwargs)
    except httpx.HTTPError as exc:
        raise HTTPException(503, "重建服务连接暂时中断，请稍后查看任务。") from exc
    if not result.is_success:
        code = (
            result.status_code if result.status_code in {400, 404, 409, 413, 415, 422, 429} else 503
        )
        raise HTTPException(code, "重建服务暂未接受此操作，请检查任务状态后再试。")
    return result


def snapshot(
    response: httpx.Response, expected_id: str | None = None, public_id: str | None = None
) -> dict:
    try:
        item = response.json()
        identifier = item["id"]
        if (
            not re.fullmatch(r"[a-f0-9]{32}", identifier)
            or expected_id is not None
            and identifier != expected_id
        ):
            raise ValueError("Unexpected job identity")
        if item.get("result"):
            result = item["result"]
            for kind in ("svg", "png"):
                if result[kind] != f"/local-api/jobs/{identifier}/result.{kind}":
                    raise ValueError("Unexpected artifact location")
                result[kind] = f"/api/v1/reconstructions/{public_id or identifier}/result.{kind}"
        item["id"] = public_id or identifier
        return item
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(502, "重建服务返回了无法识别的任务状态。") from exc


async def owned_job(session, principal, job_id: str, *, lock: bool = False) -> OwnedReconstruction:
    try:
        identifier = uuid.UUID(hex=job_id)
    except ValueError as exc:
        raise HTTPException(404, "Task not found") from exc
    statement = select(OwnedReconstruction).where(
        OwnedReconstruction.user_id == principal.subject_id,
        OwnedReconstruction.id == identifier,
    )
    owned = await session.scalar(
        statement.with_for_update().execution_options(populate_existing=True) if lock else statement
    )
    if not owned:
        raise HTTPException(404, "Task not found")
    return owned


async def prepare_forward(session, principal, request, settings, job_id, retry_revision=None):
    # Persist the hold, then reacquire in a consistent order and recheck it. Another
    # request may have completed/rejected while the commit released our locks.
    while True:
        account = await budget.lock_account(session, principal.subject_id)
        owned = await owned_job(session, principal, job_id, lock=True)
        await authorize_forward(session, principal, request, settings)
        if owned.bridge_job_id:
            if retry_revision is None:
                return owned, None
            response = await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}")
            item = snapshot(response, owned.bridge_job_id, owned.id.hex)
            if item.get("retryOfRevision") == retry_revision:
                return owned, item
            if item.get("revision") != retry_revision or item.get("status") != "failed":
                raise HTTPException(409, "This task cannot be retried safely")
        needs_hold = (
            owned.budget_exposure_usd < budget.RUN_RESERVE or not owned.budget_pending
            or owned.bridge_job_id and owned.budget_retry_revision != retry_revision
        )
        if not needs_hold:
            # Keep account and job locked throughout forwarding: refresh/rejection
            # cannot release a reservation while another request is about to spend it.
            return owned, None
        await budget.refresh(session, account, settings, bridge)
        await budget.reserve(session, account, owned)
        if owned.bridge_job_id:
            owned.budget_retry_revision = retry_revision
        await session.commit()


def unconfirmed(owned: OwnedReconstruction) -> dict:
    return {
        "id": owned.id.hex,
        "revision": 1,
        "status": "failed",
        "stage": None,
        "name": (owned.submission or {}).get("filename", "FigFox.png"),
        "draftId": (owned.submission or {}).get("draftId", ""),
        "submissionPending": True,
        "error": "提交回执尚未确认。重新确认会找回原任务；若上次未送达，会提交这张原图。",
        "failure": {"billing": "unknown", "retryable": True, "resume": True},
        "result": None,
    }


async def forward_submission(owned, session, settings) -> dict:
    if owned.bridge_job_id:
        return snapshot(
            await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}"),
            owned.bridge_job_id,
            owned.id.hex,
        )
    details = owned.submission
    if details is None or owned.source_bytes is None:
        raise HTTPException(409, "Submission data is unavailable")
    try:
        response = await bridge(
            settings,
            "POST",
            "/jobs",
            headers={"Idempotency-Key": str(owned.id)},
            files={"image": (details["filename"], owned.source_bytes, details["contentType"])},
            data={"prompt": details["prompt"], "draftId": details["draftId"]},
        )
    except HTTPException as exc:
        if exc.status_code in {400, 409, 413, 415, 422, 429}:
            budget.release_rejected(owned)
            await session.commit()
        raise
    item = snapshot(response)
    owned.bridge_job_id = item["id"]
    owned.source_bytes = None
    owned.submission = None
    await session.commit()
    return snapshot(response, owned.bridge_job_id, owned.id.hex)


@router.get("/health")
async def health(
    principal: GenerationPrincipal, session: SessionDependency, settings: SettingsDependency,
) -> dict:
    data = (await bridge(settings, "GET", "/health")).json()
    account = await budget.lock_account(session, principal.subject_id)
    used = await budget.refresh(session, account, settings, bridge)
    remaining = max(0, account.budget_limit_usd - used)
    problems = list(data.get("problems") or [])
    if remaining < budget.RUN_RESERVE and "budget_exceeded" not in problems:
        problems.append("budget_exceeded")
    await session.commit()
    return {
        "accountId": str(principal.subject_id),
        "available": bool(data.get("available")) and remaining >= budget.RUN_RESERVE,
        "problems": problems,
        "supportsUserPrompt": data.get("supportsUserPrompt"),
        "remainingBudgetUsd": float(remaining),
        "budgetLimitUsd": float(account.budget_limit_usd),
        "allocatedBudgetUsd": float(used),
        "runReserveUsd": float(budget.RUN_RESERVE),
    }


@router.get("")
async def history(
    principal: GenerationPrincipal,
    session: SessionDependency,
    settings: SettingsDependency,
) -> list[dict]:
    jobs = list(
        await session.scalars(
            select(OwnedReconstruction)
            .where(
                OwnedReconstruction.user_id == principal.subject_id,
            )
            .order_by(OwnedReconstruction.created_at.desc())
            .limit(50)
        )
    )
    semaphore = asyncio.Semaphore(5)

    async def read(owned: OwnedReconstruction) -> dict:
        if not owned.bridge_job_id:
            return unconfirmed(owned)
        async with semaphore:
            return snapshot(
                await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}"),
                owned.bridge_job_id,
                owned.id.hex,
            )

    return list(await asyncio.gather(*(read(owned) for owned in jobs)))


@router.post("", dependencies=[Depends(trusted_origin)])
async def submit(
    request: Request,
    principal: GenerationPrincipal,
    session: SessionDependency,
    settings: SettingsDependency,
    image: Annotated[UploadFile, File()],
    request_id: Annotated[uuid.UUID, Header(alias="Idempotency-Key")],
    prompt: Annotated[str, Form(max_length=12000)] = "",
    draft_id: Annotated[str, Form(alias="draftId", max_length=200)] = "",
) -> dict:
    data = await image.read(settings.asset_max_upload_bytes + 1)
    if not data or len(data) > settings.asset_max_upload_bytes:
        raise HTTPException(413, "Image exceeds the upload limit")
    fingerprint = hashlib.sha256(
        json.dumps(
            [
                hashlib.sha256(data).hexdigest(),
                image.filename,
                image.content_type,
                prompt,
                draft_id,
            ],
            ensure_ascii=False,
        ).encode()
    ).hexdigest()
    # Ownership and the server-generated bridge idempotency key survive lost HTTP responses.
    # A guessed client key cannot retrieve another account's job from the private service.
    account = await budget.lock_account(session, principal.subject_id)
    await authorize_forward(session, principal, request, settings)
    await budget.refresh(session, account, settings, bridge)
    await session.execute(
        insert(OwnedReconstruction)
        .values(
            id=uuid.uuid4(),
            user_id=principal.subject_id,
            client_request_id=request_id,
            fingerprint=fingerprint,
            source_bytes=data,
            budget_exposure_usd=0,
            budget_pending=False,
            submission={
                "filename": image.filename or "image.png",
                "contentType": image.content_type,
                "prompt": prompt,
                "draftId": draft_id,
            },
        )
        .on_conflict_do_nothing(index_elements=["user_id", "client_request_id"])
    )
    owned = await session.scalar(
        select(OwnedReconstruction)
        .where(
            OwnedReconstruction.user_id == principal.subject_id,
            OwnedReconstruction.client_request_id == request_id,
        )
        .with_for_update()
    )
    if owned.fingerprint != fingerprint:
        raise HTTPException(409, "This submission key belongs to a different image or prompt")
    if not owned.bridge_job_id:
        await budget.reserve(session, account, owned)
    # Durable hold BEFORE the network call. A crash or lost reply cannot lose the reservation.
    await session.commit()
    owned, _ = await prepare_forward(session, principal, request, settings, owned.id.hex)
    # Recheck after receiving the upload and acquiring the submission lock.
    await authorize_forward(session, principal, request, settings)
    return await forward_submission(owned, session, settings)


@router.get("/{job_id}")
async def read_job(
    job_id: str,
    principal: GenerationPrincipal,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict:
    owned = await owned_job(session, principal, job_id)
    if not owned.bridge_job_id:
        return unconfirmed(owned)
    return snapshot(
        await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}"),
        owned.bridge_job_id,
        owned.id.hex,
    )


class RetryInput(BaseModel):
    revision: int = Field(ge=1)


@router.post("/{job_id}/retry", dependencies=[Depends(trusted_origin)])
async def retry_job(
    request: Request,
    job_id: str,
    body: RetryInput,
    principal: GenerationPrincipal,
    session: SessionDependency,
    settings: SettingsDependency,
) -> dict:
    # Ownership is checked before any bridge read; budgets always lock account before job.
    await owned_job(session, principal, job_id)
    owned, previous = await prepare_forward(
        session, principal, request, settings, job_id, body.revision,
    )
    if previous is not None:
        return previous
    if not owned.bridge_job_id:
        return await forward_submission(owned, session, settings)
    try:
        response = await bridge(
            settings,
            "POST",
            f"/jobs/{owned.bridge_job_id}/retry",
            json=body.model_dump(),
        )
    except HTTPException as exc:
        if exc.status_code in {400, 404, 409, 422, 429}:
            # Definite rejection: allow the unchanged terminal receipt to settle the hold.
            owned.budget_retry_revision = 0
            await session.commit()
        raise
    return snapshot(
        response,
        owned.bridge_job_id,
        owned.id.hex,
    )


@router.get("/{job_id}/result.{kind}")
async def artifact(
    job_id: str,
    kind: Literal["svg", "png"],
    principal: GenerationPrincipal,
    session: SessionDependency,
    settings: SettingsDependency,
) -> Response:
    owned = await owned_job(session, principal, job_id)
    if not owned.bridge_job_id:
        raise HTTPException(404, "Result not available")
    result = await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}/result.{kind}")
    return Response(
        result.content,
        media_type="image/svg+xml" if kind == "svg" else "image/png",
        headers={
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "sandbox; default-src 'none'",
            "Content-Disposition": f'attachment; filename="FigFox.{kind}"',
        },
    )
