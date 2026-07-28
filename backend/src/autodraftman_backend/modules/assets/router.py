import uuid
from datetime import UTC, datetime
from functools import lru_cache, partial
from typing import Annotated

from anyio import to_thread
from fastapi import APIRouter, Depends, HTTPException, Query, status

from autodraftman_backend.api.dependencies import (
    PrincipalDependency,
    SessionDependency,
    SettingsDependency,
)
from autodraftman_backend.core.config import get_settings
from autodraftman_backend.modules.assets.schemas import (
    AssetPage,
    AssetRead,
    DownloadRead,
    PresignedRequestRead,
    UploadIntentCreate,
    UploadIntentRead,
)
from autodraftman_backend.modules.assets.service import (
    AssetCompletionError,
    complete_reference_asset,
    create_reference_asset,
    get_owned_asset,
    invalidate_reference_asset,
    list_assets,
    soft_delete_asset,
)
from autodraftman_backend.modules.assets.storage import (
    ObjectStorage,
    S3ObjectStorage,
    StorageValidationError,
)

router = APIRouter(prefix="/assets", tags=["assets"])


@lru_cache
def get_object_storage() -> ObjectStorage:
    return S3ObjectStorage(get_settings())


ObjectStorageDependency = Annotated[ObjectStorage, Depends(get_object_storage)]


@router.post(
    "/upload-intents",
    response_model=UploadIntentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_upload_intent(
    payload: UploadIntentCreate,
    principal: PrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
    storage: ObjectStorageDependency,
) -> UploadIntentRead:
    if payload.media_type not in settings.allowed_image_media_type_set:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image format",
        )
    if payload.byte_size > settings.asset_max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds the upload size limit",
        )

    asset = await create_reference_asset(
        session,
        principal,
        bucket=settings.s3_bucket,
        original_filename=payload.original_filename,
        media_type=payload.media_type,
        byte_size=payload.byte_size,
        guest_content_ttl_days=settings.guest_content_ttl_days,
    )
    upload = storage.create_upload_request(
        object_key=asset.object_key,
        media_type=asset.media_type,
    )
    await session.commit()
    return UploadIntentRead(
        asset=AssetRead.model_validate(asset),
        upload=PresignedRequestRead.model_validate(upload, from_attributes=True),
    )


@router.get("", response_model=AssetPage)
async def assets(
    principal: PrincipalDependency,
    session: SessionDependency,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AssetPage:
    items = await list_assets(
        session,
        principal,
        limit=limit,
        offset=offset,
    )
    return AssetPage(
        items=[AssetRead.model_validate(item) for item in items],
        limit=limit,
        offset=offset,
    )


@router.post("/{asset_id}/complete", response_model=AssetRead)
async def complete_upload(
    asset_id: uuid.UUID,
    principal: PrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
    storage: ObjectStorageDependency,
) -> AssetRead:
    asset = await get_owned_asset(session, principal, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.status == "ready":
        return AssetRead.model_validate(asset)
    if asset.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asset is not awaiting upload completion",
        )

    object_key = asset.object_key
    await session.rollback()
    try:
        image = await to_thread.run_sync(
            partial(
                storage.inspect_image,
                object_key=object_key,
                allowed_media_types=settings.allowed_image_media_type_set,
                max_bytes=settings.asset_max_upload_bytes,
                max_pixels=settings.asset_max_pixels,
            )
        )
    except StorageValidationError as exc:
        object_was_deleted = False
        try:
            await to_thread.run_sync(partial(storage.delete, object_key=object_key))
            object_was_deleted = True
        except Exception:
            object_was_deleted = False
        asset = await get_owned_asset(session, principal, asset_id, for_update=True)
        if asset is not None:
            invalidate_reference_asset(
                asset,
                now=datetime.now(UTC),
                object_was_deleted=object_was_deleted,
            )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    asset = await get_owned_asset(session, principal, asset_id, for_update=True)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.status == "ready":
        return AssetRead.model_validate(asset)
    try:
        complete_reference_asset(asset, image)
    except AssetCompletionError as exc:
        object_was_deleted = False
        try:
            await to_thread.run_sync(partial(storage.delete, object_key=object_key))
            object_was_deleted = True
        except Exception:
            object_was_deleted = False
        invalidate_reference_asset(
            asset,
            now=datetime.now(UTC),
            object_was_deleted=object_was_deleted,
        )
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    await session.commit()
    return AssetRead.model_validate(asset)


@router.get("/{asset_id}/download", response_model=DownloadRead)
async def download_asset(
    asset_id: uuid.UUID,
    principal: PrincipalDependency,
    session: SessionDependency,
    storage: ObjectStorageDependency,
) -> DownloadRead:
    asset = await get_owned_asset(session, principal, asset_id)
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Asset is not ready",
        )
    download = storage.create_download_request(object_key=asset.object_key)
    return DownloadRead(url=download.url, expires_at=download.expires_at)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_asset(
    asset_id: uuid.UUID,
    principal: PrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> None:
    deleted = await soft_delete_asset(
        session,
        principal,
        asset_id,
        purge_after_hours=settings.asset_delete_grace_hours,
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
