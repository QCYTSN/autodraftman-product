"""Add kernel-independent workspace drafts.

Revision ID: 20260729_0005
Revises: 20260728_0004
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0005"
down_revision: str | Sequence[str] | None = "20260728_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "drafts",
        sa.Column("owner_user_id", sa.Uuid(), nullable=True),
        sa.Column("owner_guest_id", sa.Uuid(), nullable=True),
        sa.Column("prompt", sa.Text(), server_default="", nullable=False),
        sa.Column("mode", sa.String(length=16), server_default="text", nullable=False),
        sa.Column("aspect_ratio", sa.String(length=8), server_default="16:9", nullable=False),
        sa.Column("output_format", sa.String(length=8), server_default="PNG", nullable=False),
        sa.Column("visibility", sa.String(length=16), server_default="private", nullable=False),
        sa.Column("reference_asset_id", sa.Uuid(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "(owner_user_id IS NOT NULL AND owner_guest_id IS NULL) OR "
            "(owner_user_id IS NULL AND owner_guest_id IS NOT NULL)",
            name=op.f("ck_drafts_exactly_one_owner"),
        ),
        sa.CheckConstraint("mode IN ('text', 'reference')", name=op.f("ck_drafts_mode")),
        sa.CheckConstraint(
            "aspect_ratio IN ('16:9', '4:3', '1:1')",
            name=op.f("ck_drafts_aspect_ratio"),
        ),
        sa.CheckConstraint(
            "output_format IN ('PNG', 'JPG', 'WebP')",
            name=op.f("ck_drafts_output_format"),
        ),
        sa.CheckConstraint(
            "visibility IN ('private', 'public')",
            name=op.f("ck_drafts_visibility"),
        ),
        sa.ForeignKeyConstraint(
            ["owner_guest_id"],
            ["guest_identities.id"],
            name=op.f("fk_drafts_owner_guest_id_guest_identities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            name=op.f("fk_drafts_owner_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reference_asset_id"],
            ["assets.id"],
            name=op.f("fk_drafts_reference_asset_id_assets"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_drafts")),
    )
    op.create_index("ix_drafts_user_updated", "drafts", ["owner_user_id", "updated_at"])
    op.create_index("ix_drafts_guest_updated", "drafts", ["owner_guest_id", "updated_at"])
    op.create_index("ix_drafts_expires_at", "drafts", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_drafts_expires_at", table_name="drafts")
    op.drop_index("ix_drafts_guest_updated", table_name="drafts")
    op.drop_index("ix_drafts_user_updated", table_name="drafts")
    op.drop_table("drafts")
