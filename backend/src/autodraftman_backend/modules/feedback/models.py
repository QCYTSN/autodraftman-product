from __future__ import annotations

import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Feedback(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "feedback"
    __table_args__ = (
        CheckConstraint(
            "(owner_user_id IS NOT NULL AND owner_guest_id IS NULL) OR "
            "(owner_user_id IS NULL AND owner_guest_id IS NOT NULL)",
            name="exactly_one_owner",
        ),
        CheckConstraint(
            "category IN ('product', 'bug', 'account', 'other')",
            name="category",
        ),
        CheckConstraint(
            "status IN ('received', 'in_review', 'resolved', 'closed')",
            name="status",
        ),
        CheckConstraint("locale IN ('zh', 'en')", name="locale"),
        Index("ix_feedback_user_created", "owner_user_id", "created_at"),
        Index("ix_feedback_guest_created", "owner_guest_id", "created_at"),
        Index("ix_feedback_status_created", "status", "created_at"),
    )

    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    owner_guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guest_identities.id", ondelete="CASCADE"),
    )
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(320))
    page_url: Mapped[str | None] = mapped_column(String(2048))
    locale: Mapped[str] = mapped_column(String(2), nullable=False, default="zh")
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="received",
        server_default="received",
    )
