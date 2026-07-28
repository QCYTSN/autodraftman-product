"""Add OAuth login attempts and multi-provider account metadata.

Revision ID: 20260728_0002
Revises: 20260728_0001
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_0002"
down_revision: str | Sequence[str] | None = "20260728_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("guest_trial_claimed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "auth_identities",
        sa.Column("issuer", sa.String(length=255), server_default="default", nullable=False),
    )
    op.drop_constraint(
        "uq_auth_identity_provider_subject",
        "auth_identities",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_auth_identity_provider_issuer_subject",
        "auth_identities",
        ["provider", "issuer", "provider_subject"],
    )
    op.alter_column("auth_identities", "issuer", server_default=None)

    op.create_table(
        "oauth_login_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("state_hash", sa.String(length=64), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("mode", sa.String(length=16), nullable=False),
        sa.Column("code_verifier", sa.String(length=128), nullable=False),
        sa.Column("initiator_user_id", sa.Uuid(), nullable=True),
        sa.Column("initiator_guest_id", sa.Uuid(), nullable=True),
        sa.Column("redirect_uri", sa.String(length=2048), nullable=False),
        sa.Column("return_url", sa.String(length=2048), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "mode IN ('login', 'link')",
            name="ck_oauth_login_attempts_mode",
        ),
        sa.CheckConstraint(
            "NOT (initiator_user_id IS NOT NULL AND initiator_guest_id IS NOT NULL)",
            name="ck_oauth_login_attempts_single_initiator",
        ),
        sa.CheckConstraint(
            "mode = 'login' OR initiator_user_id IS NOT NULL",
            name="ck_oauth_login_attempts_link_requires_user",
        ),
        sa.ForeignKeyConstraint(
            ["initiator_guest_id"],
            ["guest_identities.id"],
            name=op.f("fk_oauth_login_attempts_initiator_guest_id_guest_identities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["initiator_user_id"],
            ["users.id"],
            name=op.f("fk_oauth_login_attempts_initiator_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_oauth_login_attempts")),
        sa.UniqueConstraint(
            "state_hash",
            name=op.f("uq_oauth_login_attempts_state_hash"),
        ),
    )
    op.create_index(
        op.f("ix_oauth_login_attempts_expires_at"),
        "oauth_login_attempts",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_oauth_login_attempts_initiator_user_id"),
        "oauth_login_attempts",
        ["initiator_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("oauth_login_attempts")
    op.drop_constraint(
        "uq_auth_identity_provider_issuer_subject",
        "auth_identities",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_auth_identity_provider_subject",
        "auth_identities",
        ["provider", "provider_subject"],
    )
    op.drop_column("auth_identities", "issuer")
    op.drop_column("users", "guest_trial_claimed_at")
