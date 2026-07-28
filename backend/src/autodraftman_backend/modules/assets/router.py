import uuid

from fastapi import APIRouter, HTTPException, Query, status

from autodraftman_backend.api.dependencies import (
    PrincipalDependency,
    SessionDependency,
    SettingsDependency,
)
from autodraftman_backend.modules.assets.schemas import AssetPage, AssetRead
from autodraftman_backend.modules.assets.service import list_assets, soft_delete_asset

router = APIRouter(prefix="/assets", tags=["assets"])


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
