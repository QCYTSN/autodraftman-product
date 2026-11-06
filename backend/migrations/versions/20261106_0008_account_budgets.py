"""Account quotas, retaining all historical ownership and billing reservations."""

import sqlalchemy as sa
from alembic import op

revision = "20261106_0008"
down_revision = "20261106_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("internal_accounts", sa.Column(
        "budget_limit_usd", sa.Numeric(14, 6), nullable=False, server_default="0",
    ))
    # Historical jobs remain fully reserved until their existing receipts are read.
    op.add_column("owned_reconstructions", sa.Column(
        "budget_exposure_usd", sa.Numeric(14, 6), nullable=False, server_default="5",
    ))
    op.add_column("owned_reconstructions", sa.Column(
        "budget_pending", sa.Boolean(), nullable=False, server_default=sa.true(),
    ))
    op.add_column("owned_reconstructions", sa.Column(
        "budget_retry_revision", sa.Integer(), nullable=False, server_default="0",
    ))


def downgrade() -> None:
    for name in ("budget_retry_revision", "budget_pending", "budget_exposure_usd"):
        op.drop_column("owned_reconstructions", name)
    op.drop_column("internal_accounts", "budget_limit_usd")
