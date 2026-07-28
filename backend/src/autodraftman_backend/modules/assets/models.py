from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Asset(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint(
            "(owner_user_id IS NOT NULL AND owner_guest_id IS NULL) OR "
            "(owner_user_id IS NULL AND owner_guest_id IS NOT NULL)",
            name="exactly_one_owner",
        ),
        CheckConstraint("byte_size >= 0", name="nonnegative_byte_size"),
        CheckConstraint("kind IN ('reference', 'result')", name="kind"),
        CheckConstraint("status IN ('pending', 'ready', 'deleted')", name="status"),
        CheckConstraint(
            "visibility IN ('private', 'unlisted', 'public')",
            name="visibility",
        ),
        UniqueConstraint(
            "storage_provider",
            "bucket",
            "object_key",
            name="uq_assets_storage_location",
        ),
        Index("ix_assets_user_created", "owner_user_id", "created_at"),
        Index("ix_assets_guest_created", "owner_guest_id", "created_at"),
    )

    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    owner_guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guest_identities.id", ondelete="CASCADE"),
    )
    storage_provider: Mapped[str] = mapped_column(String(32), nullable=False)
    bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    media_type: Mapped[str] = mapped_column(String(127), nullable=False)
    byte_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64))
    visibility: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="private",
        server_default="private",
    )
    deleted_at: Mapped[datetime | None]
