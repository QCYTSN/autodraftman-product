from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import Select, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.modules.assets.models import Asset
from autodraftman_backend.modules.assets.storage import StoredImage, build_object_key
from autodraftman_backend.modules.identity.service import Principal


class AssetCompletionError(Exception):
    pass


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


async def get_owned_asset(
    session: AsyncSession,
    principal: Principal,
    asset_id: uuid.UUID,
    *,
    for_update: bool = False,
) -> Asset | None:
    query = owned_asset_query(principal).where(Asset.id == asset_id)
    if for_update:
        query = query.with_for_update()
    return (await session.execute(query)).scalar_one_or_none()


async def create_reference_asset(
    session: AsyncSession,
    principal: Principal,
    *,
    bucket: str,
    original_filename: str,
    media_type: str,
    byte_size: int,
    guest_content_ttl_days: int,
) -> Asset:
    asset_id = uuid.uuid4()
    expires_at = None
    if principal.kind == "guest":
        expires_at = datetime.now(UTC) + timedelta(days=guest_content_ttl_days)

    asset = Asset(
        id=asset_id,
        owner_user_id=principal.subject_id if principal.kind == "user" else None,
        owner_guest_id=principal.subject_id if principal.kind == "guest" else None,
        storage_provider="s3",
        bucket=bucket,
        object_key=build_object_key(
            owner_kind=principal.kind,
            owner_id=principal.subject_id,
            asset_id=asset_id,
            original_filename=original_filename,
        ),
        original_filename=original_filename,
        kind="reference",
        status="pending",
        media_type=media_type,
        byte_size=byte_size,
        width_px=None,
        height_px=None,
        visibility="private",
        expires_at=expires_at,
    )
    session.add(asset)
    await session.flush()
    return asset


def complete_reference_asset(asset: Asset, image: StoredImage) -> None:
    if asset.status == "ready":
        return
    if asset.status != "pending":
        raise AssetCompletionError("Only a pending asset can be completed.")
    if image.byte_size != asset.byte_size:
        raise AssetCompletionError("The uploaded file size does not match the upload intent.")
    asset.media_type = image.media_type
    asset.byte_size = image.byte_size
    asset.width_px = image.width_px
    asset.height_px = image.height_px
    asset.checksum_sha256 = image.checksum_sha256
    asset.status = "ready"


def invalidate_reference_asset(
    asset: Asset,
    *,
    now: datetime,
    object_was_deleted: bool,
) -> None:
    asset.status = "deleted"
    asset.deleted_at = now
    asset.purge_after = now
    if object_was_deleted:
        asset.purged_at = now


async def soft_delete_asset(
    session: AsyncSession,
    principal: Principal,
    asset_id: uuid.UUID,
    *,
    purge_after_hours: int,
) -> bool:
    asset = await get_owned_asset(session, principal, asset_id, for_update=True)
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
