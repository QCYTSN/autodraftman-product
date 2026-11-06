from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    UniqueConstraint,
    false,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import Base, CreatedAtMixin, UUIDPrimaryKeyMixin


class InternalAccount(CreatedAtMixin, Base):
    __tablename__ = "internal_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false())
    generation_allowed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )


class LoginThrottle(Base):
    __tablename__ = "internal_login_throttles"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False)


class OwnedReconstruction(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "owned_reconstructions"
    __table_args__ = (UniqueConstraint("user_id", "client_request_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_request_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    bridge_job_id: Mapped[str | None] = mapped_column(String(32), unique=True)
    source_bytes: Mapped[bytes | None] = mapped_column(LargeBinary)
    submission: Mapped[dict | None] = mapped_column(JSONB)
