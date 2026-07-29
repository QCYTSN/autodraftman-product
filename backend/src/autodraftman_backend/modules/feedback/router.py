from fastapi import APIRouter, Query, status

from autodraftman_backend.api.dependencies import GuestPrincipalDependency, SessionDependency
from autodraftman_backend.modules.feedback.schemas import (
    FeedbackCreate,
    FeedbackPage,
    FeedbackRead,
)
from autodraftman_backend.modules.feedback.service import create_feedback, list_feedback

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("", response_model=FeedbackPage)
async def feedback_history(
    principal: GuestPrincipalDependency,
    session: SessionDependency,
    limit: int = Query(default=10, ge=1, le=30),
    offset: int = Query(default=0, ge=0),
) -> FeedbackPage:
    items = await list_feedback(session, principal, limit=limit, offset=offset)
    return FeedbackPage(
        items=[FeedbackRead.model_validate(item) for item in items],
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackCreate,
    principal: GuestPrincipalDependency,
    session: SessionDependency,
) -> FeedbackRead:
    entry = await create_feedback(session, principal, payload)
    await session.commit()
    return FeedbackRead.model_validate(entry)
