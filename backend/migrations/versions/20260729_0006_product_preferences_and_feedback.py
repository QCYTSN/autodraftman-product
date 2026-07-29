"""Add draft titles, account preferences, and feedback receipts.

Revision ID: 20260729_0006
Revises: 20260729_0005
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260729_0006"
down_revision: str | Sequence[str] | None = "20260729_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "default_visibility",
            sa.String(length=16),
            server_default="private",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        op.f("ck_users_default_visibility"),
        "users",
        "default_visibility IN ('private', 'public')",
    )
    op.add_column("drafts", sa.Column("title", sa.String(length=120), nullable=True))

    op.create_table(
        "feedback",
        sa.Column("owner_user_id", sa.Uuid(), nullable=True),
        sa.Column("owner_guest_id", sa.Uuid(), nullable=True),
        sa.Column("category", sa.String(length=16), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("contact_email", sa.String(length=320), nullable=True),
        sa.Column("page_url", sa.String(length=2048), nullable=True),
        sa.Column("locale", sa.String(length=2), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            server_default="received",
            nullable=False,
        ),
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
            name=op.f("ck_feedback_exactly_one_owner"),
        ),
        sa.CheckConstraint(
            "category IN ('product', 'bug', 'account', 'other')",
            name=op.f("ck_feedback_category"),
        ),
        sa.CheckConstraint(
            "status IN ('received', 'in_review', 'resolved', 'closed')",
            name=op.f("ck_feedback_status"),
        ),
        sa.CheckConstraint("locale IN ('zh', 'en')", name=op.f("ck_feedback_locale")),
        sa.ForeignKeyConstraint(
            ["owner_guest_id"],
            ["guest_identities.id"],
            name=op.f("fk_feedback_owner_guest_id_guest_identities"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["owner_user_id"],
            ["users.id"],
            name=op.f("fk_feedback_owner_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_feedback")),
    )
    op.create_index(
        "ix_feedback_user_created",
        "feedback",
        ["owner_user_id", "created_at"],
    )
    op.create_index(
        "ix_feedback_guest_created",
        "feedback",
        ["owner_guest_id", "created_at"],
    )
    op.create_index(
        "ix_feedback_status_created",
        "feedback",
        ["status", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_feedback_status_created", table_name="feedback")
    op.drop_index("ix_feedback_guest_created", table_name="feedback")
    op.drop_index("ix_feedback_user_created", table_name="feedback")
    op.drop_table("feedback")
    op.drop_column("drafts", "title")
    op.drop_constraint(op.f("ck_users_default_visibility"), "users", type_="check")
    op.drop_column("users", "default_visibility")
