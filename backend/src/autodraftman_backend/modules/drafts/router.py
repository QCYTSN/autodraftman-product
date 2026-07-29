import uuid

from fastapi import APIRouter, HTTPException, Query, status

from autodraftman_backend.api.dependencies import (
    GuestPrincipalDependency,
    SessionDependency,
    SettingsDependency,
)
from autodraftman_backend.modules.drafts.schemas import (
    DraftCreate,
    DraftPage,
    DraftRead,
    DraftUpdate,
)
from autodraftman_backend.modules.drafts.service import (
    DraftReferenceError,
    create_draft,
    delete_draft,
    get_owned_draft,
    list_drafts,
    update_draft,
)

router = APIRouter(prefix="/drafts", tags=["drafts"])


@router.get("", response_model=DraftPage)
async def drafts(
    principal: GuestPrincipalDependency,
    session: SessionDependency,
    limit: int = Query(default=30, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> DraftPage:
    items = await list_drafts(session, principal, limit=limit, offset=offset)
    return DraftPage(
        items=[DraftRead.model_validate(item) for item in items],
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=DraftRead, status_code=status.HTTP_201_CREATED)
async def add_draft(
    payload: DraftCreate,
    principal: GuestPrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> DraftRead:
    try:
        draft = await create_draft(
            session,
            principal,
            payload,
            guest_content_ttl_days=settings.guest_content_ttl_days,
        )
    except DraftReferenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await session.commit()
    return DraftRead.model_validate(draft)


@router.get("/{draft_id}", response_model=DraftRead)
async def draft(
    draft_id: uuid.UUID,
    principal: GuestPrincipalDependency,
    session: SessionDependency,
) -> DraftRead:
    item = await get_owned_draft(session, principal, draft_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    return DraftRead.model_validate(item)


@router.patch("/{draft_id}", response_model=DraftRead)
async def change_draft(
    draft_id: uuid.UUID,
    payload: DraftUpdate,
    principal: GuestPrincipalDependency,
    session: SessionDependency,
    settings: SettingsDependency,
) -> DraftRead:
    item = await get_owned_draft(session, principal, draft_id, for_update=True)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    try:
        item = await update_draft(
            session,
            principal,
            item,
            payload,
            guest_content_ttl_days=settings.guest_content_ttl_days,
        )
    except DraftReferenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    await session.commit()
    return DraftRead.model_validate(item)


@router.delete("/{draft_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_draft(
    draft_id: uuid.UUID,
    principal: GuestPrincipalDependency,
    session: SessionDependency,
) -> None:
    item = await get_owned_draft(session, principal, draft_id, for_update=True)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    await delete_draft(item)
    await session.commit()
