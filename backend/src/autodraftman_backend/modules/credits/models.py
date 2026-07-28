from __future__ import annotations

import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from autodraftman_backend.core.database import (
    Base,
    CreatedAtMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class CreditAccount(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "credit_accounts"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND guest_id IS NULL) OR "
            "(user_id IS NULL AND guest_id IS NOT NULL)",
            name="exactly_one_owner",
        ),
        CheckConstraint("available_credits >= 0", name="available_nonnegative"),
        CheckConstraint("reserved_credits >= 0", name="reserved_nonnegative"),
        Index(
            "uq_credit_accounts_user",
            "user_id",
            unique=True,
            postgresql_where=text("user_id IS NOT NULL"),
        ),
        Index(
            "uq_credit_accounts_guest",
            "guest_id",
            unique=True,
            postgresql_where=text("guest_id IS NOT NULL"),
        ),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
    )
    guest_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("guest_identities.id", ondelete="CASCADE"),
    )
    available_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    reserved_credits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    version: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )
    __mapper_args__ = {"version_id_col": version}


class CreditTransaction(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "credit_transactions"
    __table_args__ = (
        CheckConstraint(
            "delta_available <> 0 OR delta_reserved <> 0",
            name="nonzero_delta",
        ),
        CheckConstraint("available_after >= 0", name="available_nonnegative"),
        CheckConstraint("reserved_after >= 0", name="reserved_nonnegative"),
        CheckConstraint(
            "kind IN ('grant', 'reserve', 'settle', 'release', 'refund', 'adjustment')",
            name="kind",
        ),
        UniqueConstraint(
            "account_id",
            "idempotency_key",
            name="uq_credit_transactions_account_idempotency",
        ),
        Index("ix_credit_transactions_account_created", "account_id", "created_at"),
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("credit_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    delta_available: Mapped[int] = mapped_column(Integer, nullable=False)
    delta_reserved: Mapped[int] = mapped_column(Integer, nullable=False)
    available_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_after: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(64))
    reference_id: Mapped[uuid.UUID | None]
    idempotency_key: Mapped[str | None] = mapped_column(String(255))
