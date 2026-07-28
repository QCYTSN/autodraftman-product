"""Add verified image dimensions to assets.

Revision ID: 20260728_0004
Revises: 20260728_0003
Create Date: 2026-07-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260728_0004"
down_revision: str | Sequence[str] | None = "20260728_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("assets", sa.Column("width_px", sa.Integer(), nullable=True))
    op.add_column("assets", sa.Column("height_px", sa.Integer(), nullable=True))
    op.create_check_constraint(
        "positive_dimensions",
        "assets",
        "(width_px IS NULL AND height_px IS NULL) OR (width_px > 0 AND height_px > 0)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_assets_positive_dimensions", "assets", type_="check")
    op.drop_column("assets", "height_px")
    op.drop_column("assets", "width_px")
