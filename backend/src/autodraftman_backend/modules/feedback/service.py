from __future__ import annotations

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.modules.feedback.models import Feedback
from autodraftman_backend.modules.feedback.schemas import FeedbackCreate
from autodraftman_backend.modules.identity.service import Principal


def owned_feedback_query(principal: Principal) -> Select[tuple[Feedback]]:
    query = select(Feedback)
    if principal.kind == "user":
        return query.where(Feedback.owner_user_id == principal.subject_id)
    return query.where(Feedback.owner_guest_id == principal.subject_id)


async def create_feedback(
    session: AsyncSession,
    principal: Principal,
    payload: FeedbackCreate,
) -> Feedback:
    entry = Feedback(
        owner_user_id=principal.subject_id if principal.kind == "user" else None,
        owner_guest_id=principal.subject_id if principal.kind == "guest" else None,
        category=payload.category,
        message=payload.message,
        contact_email=payload.contact_email,
        page_url=payload.page_url,
        locale=payload.locale,
        status="received",
    )
    session.add(entry)
    await session.flush()
    return entry


async def list_feedback(
    session: AsyncSession,
    principal: Principal,
    *,
    limit: int,
    offset: int,
) -> list[Feedback]:
    result = await session.execute(
        owned_feedback_query(principal)
        .order_by(Feedback.created_at.desc(), Feedback.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())
