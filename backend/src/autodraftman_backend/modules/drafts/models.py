from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Draft(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "drafts"
    __table_args__ = (
        CheckConstraint(
            "(owner_user_id IS NOT NULL AND owner_guest_id IS NULL) OR "
            "(owner_user_id IS NULL AND owner_guest_id IS NOT NULL)",
            name="exactly_one_owner",
        ),
        CheckConstraint("mode IN ('text', 'reference')", name="mode"),
        CheckConstraint("aspect_ratio IN ('16:9', '4:3', '1:1')", name="aspect_ratio"),
        CheckConstraint("output_format IN ('PNG', 'JPG', 'WebP')", name="output_format"),
        CheckConstraint("visibility IN ('private', 'public')", name="visibility"),
        Index("ix_drafts_user_updated", "owner_user_id", "updated_at"),
        Index("ix_drafts_guest_updated", "owner_guest_id", "updated_at"),
        Index("ix_drafts_expires_at", "expires_at"),
    )

    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    owner_guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guest_identities.id", ondelete="CASCADE"),
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    mode: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="text",
        server_default="text",
    )
    aspect_ratio: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        default="16:9",
        server_default="16:9",
    )
    output_format: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        default="PNG",
        server_default="PNG",
    )
    visibility: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="private",
        server_default="private",
    )
    reference_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
