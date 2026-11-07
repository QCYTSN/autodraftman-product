"""Internal passwords and reconstruction ownership; no reconstruction engine changes."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261106_0007"
down_revision = "20260729_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "internal_accounts",
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("username", sa.String(32), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("generation_allowed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_table(
        "internal_login_throttles",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
    )
    op.create_table(
        "owned_reconstructions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("client_request_id", sa.Uuid(), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("bridge_job_id", sa.String(32), unique=True),
        sa.Column("source_bytes", sa.LargeBinary(), nullable=True),
        sa.Column("submission", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.UniqueConstraint("user_id", "client_request_id"),
    )
    op.create_index("ix_owned_reconstructions_user_id", "owned_reconstructions", ["user_id"])


def downgrade() -> None:
    op.drop_table("owned_reconstructions")
    op.drop_table("internal_login_throttles")
    op.drop_table("internal_accounts")
