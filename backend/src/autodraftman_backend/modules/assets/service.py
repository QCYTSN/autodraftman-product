from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.modules.assets.models import Asset
from autodraftman_backend.modules.identity.service import Principal


def owned_asset_query(principal: Principal) -> Select[tuple[Asset]]:
    query = select(Asset).where(Asset.deleted_at.is_(None))
    if principal.kind == "user":
        return query.where(Asset.owner_user_id == principal.subject_id)
    return query.where(Asset.owner_guest_id == principal.subject_id)


async def list_assets(
    session: AsyncSession,
    principal: Principal,
    *,
    limit: int,
    offset: int,
) -> list[Asset]:
    result = await session.execute(
        owned_asset_query(principal)
        .order_by(Asset.created_at.desc(), Asset.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())


async def soft_delete_asset(
    session: AsyncSession,
    principal: Principal,
    asset_id: uuid.UUID,
) -> bool:
    result = await session.execute(owned_asset_query(principal).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        return False
    asset.status = "deleted"
    asset.deleted_at = datetime.now(UTC)
    await session.commit()
    return True
