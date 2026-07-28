from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, select, update
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
    *,
    purge_after_hours: int,
) -> bool:
    result = await session.execute(owned_asset_query(principal).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if asset is None:
        return False
    schedule_asset_deletion(
        asset,
        now=datetime.now(UTC),
        purge_after_hours=purge_after_hours,
    )
    await session.commit()
    return True


def schedule_asset_deletion(
    asset: Asset,
    *,
    now: datetime,
    purge_after_hours: int,
) -> None:
    if asset.deleted_at is not None:
        return
    asset.status = "deleted"
    asset.deleted_at = now
    asset.purge_after = now + timedelta(hours=purge_after_hours)


async def schedule_expired_guest_assets(
    session: AsyncSession,
    *,
    now: datetime,
    purge_after_hours: int,
) -> int:
    result = await session.execute(
        update(Asset)
        .where(
            Asset.owner_guest_id.is_not(None),
            Asset.deleted_at.is_(None),
            Asset.expires_at.is_not(None),
            Asset.expires_at <= now,
        )
        .values(
            status="deleted",
            deleted_at=now,
            purge_after=now + timedelta(hours=purge_after_hours),
        )
    )
    await session.commit()
    return result.rowcount or 0
