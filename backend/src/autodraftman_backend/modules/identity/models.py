from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    false,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import (
    Base,
    CreatedAtMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_purge_after", "purge_after"),)

    display_name: Mapped[str | None] = mapped_column(String(120))
    avatar_url: Mapped[str | None] = mapped_column(String(2048))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=true())
    guest_trial_claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deletion_requested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    purge_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthIdentity(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "auth_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "issuer",
            "provider_subject",
            name="uq_auth_identity_provider_issuer_subject",
        ),
        Index("ix_auth_identities_user_id", "user_id"),
        Index("ix_auth_identities_email", "email"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    issuer: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_subject: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(320))
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=false(),
    )


class UserSession(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "user_sessions"
    __table_args__ = (
        Index("ix_user_sessions_user_id", "user_id"),
        Index("ix_user_sessions_expires_at", "expires_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class GuestIdentity(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "guest_identities"
    __table_args__ = (Index("ix_guest_identities_expires_at", "expires_at"),)

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    converted_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class OAuthLoginAttempt(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "oauth_login_attempts"
    __table_args__ = (
        CheckConstraint("mode IN ('login', 'link')", name="mode"),
        CheckConstraint(
            "NOT (initiator_user_id IS NOT NULL AND initiator_guest_id IS NOT NULL)",
            name="single_initiator",
        ),
        CheckConstraint(
            "mode = 'login' OR initiator_user_id IS NOT NULL",
            name="link_requires_user",
        ),
        Index("ix_oauth_login_attempts_expires_at", "expires_at"),
        Index("ix_oauth_login_attempts_initiator_user_id", "initiator_user_id"),
    )

    state_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False)
    code_verifier: Mapped[str] = mapped_column(String(128), nullable=False)
    initiator_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    initiator_guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guest_identities.id", ondelete="CASCADE"),
    )
    redirect_uri: Mapped[str] = mapped_column(String(2048), nullable=False)
    return_url: Mapped[str] = mapped_column(String(2048), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
