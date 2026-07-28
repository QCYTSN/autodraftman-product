"""Create identity, asset, and credit foundation.

Revision ID: 20260728_0001
Revises:
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )

    op.create_table(
        "guest_identities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("converted_user_id", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["converted_user_id"],
            ["users.id"],
            name=op.f("fk_guest_identities_converted_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guest_identities")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_guest_identities_token_hash")),
    )
    op.create_index(
        op.f("ix_guest_identities_expires_at"),
        "guest_identities",
        ["expires_at"],
        unique=False,
    )

    op.create_table(
        "auth_identities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_subject", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("email_verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_auth_identities_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_identities")),
        sa.UniqueConstraint(
            "provider",
            "provider_subject",
            name="uq_auth_identity_provider_subject",
        ),
    )
    op.create_index(op.f("ix_auth_identities_email"), "auth_identities", ["email"], unique=False)
    op.create_index(
        op.f("ix_auth_identities_user_id"),
        "auth_identities",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_user_sessions_token_hash")),
    )
    op.create_index(
        op.f("ix_user_sessions_expires_at"),
        "user_sessions",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_sessions_user_id"),
        "user_sessions",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "assets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), nullable=True),
        sa.Column("owner_guest_id", sa.Uuid(), nullable=True),
        sa.Column("storage_provider", sa.String(length=32), nullable=False),
        sa.Column("bucket", sa.String(length=255), nullable=False),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("media_type", sa.String(length=127), nullable=False),
        sa.Column("byte_size", sa.BigInteger(), nullable=False),
        sa.Column("checksum_sha256", sa.String(length=64), nullable=True),
        sa.Column("visibility", sa.String(length=16), server_default="private", nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "(owner_user_id IS NOT NULL AND owner_guest_id IS NULL) OR "
            "(owner_user_id IS NULL AND owner_guest_id IS NOT NULL)",
            name="ck_assets_exactly_one_owner",
        ),
        sa.CheckConstraint("byte_size >= 0", name="ck_assets_nonnegative_byte_size"),
        sa.CheckConstraint(
            "kind IN ('reference', 'result')",
            name="ck_assets_kind",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'ready', 'deleted')",
            name="ck_assets_status",
        ),
        sa.CheckConstraint(
            "visibility IN ('private', 'unlisted', 'public')",
            name="ck_assets_visibility",
        ),
        sa.ForeignKeyConstraint(
            ["owner_guest_id"],
            ["guest_identities.id"],
            name=op.f("fk_assets_owner_guest_id_guest_identities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            name=op.f("fk_assets_owner_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_assets")),
        sa.UniqueConstraint(
            "storage_provider",
            "bucket",
            "object_key",
            name="uq_assets_storage_location",
        ),
    )
    op.create_index(
        "ix_assets_guest_created",
        "assets",
        ["owner_guest_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_assets_user_created",
        "assets",
        ["owner_user_id", "created_at"],
        unique=False,
    )

    op.create_table(
        "credit_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=True),
        sa.Column("guest_id", sa.Uuid(), nullable=True),
        sa.Column("available_credits", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reserved_credits", sa.Integer(), server_default="0", nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "(user_id IS NOT NULL AND guest_id IS NULL) OR "
            "(user_id IS NULL AND guest_id IS NOT NULL)",
            name="ck_credit_accounts_exactly_one_owner",
        ),
        sa.CheckConstraint(
            "available_credits >= 0",
            name="ck_credit_accounts_available_nonnegative",
        ),
        sa.CheckConstraint(
            "reserved_credits >= 0",
            name="ck_credit_accounts_reserved_nonnegative",
        ),
        sa.ForeignKeyConstraint(
            ["guest_id"],
            ["guest_identities.id"],
            name=op.f("fk_credit_accounts_guest_id_guest_identities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_credit_accounts_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_credit_accounts")),
    )
    op.create_index(
        "uq_credit_accounts_guest",
        "credit_accounts",
        ["guest_id"],
        unique=True,
        postgresql_where=sa.text("guest_id IS NOT NULL"),
    )
    op.create_index(
        "uq_credit_accounts_user",
        "credit_accounts",
        ["user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )

    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("account_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("delta_available", sa.Integer(), nullable=False),
        sa.Column("delta_reserved", sa.Integer(), nullable=False),
        sa.Column("available_after", sa.Integer(), nullable=False),
        sa.Column("reserved_after", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("reference_type", sa.String(length=64), nullable=True),
        sa.Column("reference_id", sa.Uuid(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "delta_available <> 0 OR delta_reserved <> 0",
            name="ck_credit_transactions_nonzero_delta",
        ),
        sa.CheckConstraint(
            "available_after >= 0",
            name="ck_credit_transactions_available_nonnegative",
        ),
        sa.CheckConstraint(
            "reserved_after >= 0",
            name="ck_credit_transactions_reserved_nonnegative",
        ),
        sa.CheckConstraint(
            "kind IN ('grant', 'reserve', 'settle', 'release', 'refund', 'adjustment')",
            name="ck_credit_transactions_kind",
        ),
        sa.ForeignKeyConstraint(
            ["account_id"],
            ["credit_accounts.id"],
            name=op.f("fk_credit_transactions_account_id_credit_accounts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_credit_transactions")),
        sa.UniqueConstraint(
            "account_id",
            "idempotency_key",
            name="uq_credit_transactions_account_idempotency",
        ),
    )
    op.create_index(
        "ix_credit_transactions_account_created",
        "credit_transactions",
        ["account_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("credit_transactions")
    op.drop_table("credit_accounts")
    op.drop_table("assets")
    op.drop_table("user_sessions")
    op.drop_table("auth_identities")
    op.drop_table("guest_identities")
    op.drop_table("users")
