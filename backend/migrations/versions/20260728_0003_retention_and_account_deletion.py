"""Add retention scheduling and account deletion metadata.

Revision ID: 20260728_0003
Revises: 20260728_0002
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_0003"
down_revision: str | Sequence[str] | None = "20260728_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("deletion_requested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("purge_after", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_users_purge_after"),
        "users",
        ["purge_after"],
        unique=False,
    )

    op.add_column(
        "assets",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column("purge_after", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column("purged_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_assets_expires_at"),
        "assets",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_assets_purge_after"),
        "assets",
        ["purge_after"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_assets_purge_after"), table_name="assets")
    op.drop_index(op.f("ix_assets_expires_at"), table_name="assets")
    op.drop_column("assets", "purged_at")
    op.drop_column("assets", "purge_after")
    op.drop_column("assets", "expires_at")

    op.drop_index(op.f("ix_users_purge_after"), table_name="users")
    op.drop_column("users", "purge_after")
    op.drop_column("users", "deletion_requested_at")
