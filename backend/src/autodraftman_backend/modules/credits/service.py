from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.modules.credits.models import CreditAccount, CreditTransaction


async def get_account(session: AsyncSession, account_id) -> CreditAccount:
    result = await session.execute(select(CreditAccount).where(CreditAccount.id == account_id))
    return result.scalar_one()


async def list_transactions(
    session: AsyncSession,
    account_id,
    *,
    limit: int,
    offset: int,
) -> list[CreditTransaction]:
    result = await session.execute(
        select(CreditTransaction)
        .where(CreditTransaction.account_id == account_id)
        .order_by(CreditTransaction.created_at.desc(), CreditTransaction.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars())
