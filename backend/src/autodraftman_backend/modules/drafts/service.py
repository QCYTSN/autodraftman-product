from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.modules.assets.service import get_owned_asset
from autodraftman_backend.modules.drafts.models import Draft
from autodraftman_backend.modules.drafts.schemas import DraftCreate, DraftUpdate
from autodraftman_backend.modules.identity.service import Principal


class DraftReferenceError(Exception):
    pass


def owned_draft_query(principal: Principal) -> Select[tuple[Draft]]:
    query = select(Draft).where(Draft.deleted_at.is_(None))
    if principal.kind == "user":
        return query.where(Draft.owner_user_id == principal.subject_id)
    return query.where(Draft.owner_guest_id == principal.subject_id)


async def list_drafts(
    session: AsyncSession,
    principal: Principal,
    *,
    limit: int,
    offset: int,
) -> list[Draft]:
    result = await session.execute(
        owned_draft_query(principal)
        .order_by(Draft.updated_at.desc(), Draft.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())


async def get_owned_draft(
    session: AsyncSession,
    principal: Principal,
    draft_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Draft | None:
    query = owned_draft_query(principal).where(Draft.id == draft_id)
    if for_update:
        query = query.with_for_update()
    return (await session.execute(query)).scalar_one_or_none()


async def _validate_reference(
    session: AsyncSession,
    principal: Principal,
    reference_asset_id: uuid.UUID | None,
) -> None:
    if reference_asset_id is None:
        return
    asset = await get_owned_asset(session, principal, reference_asset_id)
    if asset is None or asset.kind != "reference" or asset.status != "ready":
        raise DraftReferenceError("The selected reference image is unavailable.")


async def create_draft(
    session: AsyncSession,
    principal: Principal,
    payload: DraftCreate,
    *,
    guest_content_ttl_days: int,
) -> Draft:
    await _validate_reference(session, principal, payload.reference_asset_id)
    expires_at = None
    if principal.kind == "guest":
        expires_at = datetime.now(UTC) + timedelta(days=guest_content_ttl_days)

    draft = Draft(
        owner_user_id=principal.subject_id if principal.kind == "user" else None,
        owner_guest_id=principal.subject_id if principal.kind == "guest" else None,
        prompt=payload.prompt,
        mode=payload.mode,
        aspect_ratio=payload.aspect_ratio,
        output_format=payload.output_format,
        visibility=payload.visibility,
        reference_asset_id=payload.reference_asset_id,
        expires_at=expires_at,
    )
    session.add(draft)
    await session.flush()
    return draft


async def update_draft(
    session: AsyncSession,
    principal: Principal,
    draft: Draft,
    payload: DraftUpdate,
    *,
    guest_content_ttl_days: int,
) -> Draft:
    values = payload.model_dump(exclude_unset=True)
    reference_asset_set = values.pop("reference_asset_set", False)
    if reference_asset_set or "reference_asset_id" in values:
        await _validate_reference(session, principal, values.get("reference_asset_id"))

    for field, value in values.items():
        setattr(draft, field, value)
    if draft.mode == "text":
        draft.reference_asset_id = None
    draft.updated_at = datetime.now(UTC)
    if principal.kind == "guest":
        draft.expires_at = datetime.now(UTC) + timedelta(days=guest_content_ttl_days)
    await session.flush()
    return draft


async def delete_draft(draft: Draft) -> None:
    draft.deleted_at = datetime.now(UTC)
