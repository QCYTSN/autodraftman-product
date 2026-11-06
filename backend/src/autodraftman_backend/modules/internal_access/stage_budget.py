"""Durable per-stage product reservation. No model, source image or receipt writes."""

import uuid
from decimal import ROUND_CEILING, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from autodraftman_backend.local_reconstruction.account_gate import AccountStagePaused
from autodraftman_backend.modules.identity.models import User

from . import budget
from .models import OwnedReconstruction


async def claim(session, request_key, job_id, recorded, reserve):
    if any(not amount.is_finite() or amount < 0 for amount in (recorded, reserve)):
        raise AccountStagePaused()
    identifier = uuid.UUID(request_key)
    user_id = await session.scalar(select(OwnedReconstruction.user_id).where(
        OwnedReconstruction.id == identifier,
    ))
    if user_id is None:
        raise AccountStagePaused("permission")
    account = await budget.lock_account(session, user_id)
    owned = await session.scalar(select(OwnedReconstruction).where(
        OwnedReconstruction.id == identifier,
    ).with_for_update().execution_options(populate_existing=True))
    active = await session.scalar(select(User.is_active).where(User.id == user_id))
    if (
        not account or not owned or not active or not account.enabled
        or not account.generation_allowed or owned.bridge_job_id not in (None, job_id)
    ):
        raise AccountStagePaused("permission")
    # The gateway's UUID is already persisted before forwarding to the private
    # worker. Its response may still be returning, hence a not-yet-bound job ID.
    target = max(owned.budget_exposure_usd, recorded + reserve).quantize(
        Decimal("0.000001"), rounding=ROUND_CEILING,
    )
    used = await budget.usage(session, account)
    if used + target - owned.budget_exposure_usd > account.budget_limit_usd:
        raise AccountStagePaused("budget")
    owned.budget_exposure_usd = target
    owned.budget_pending = True
    await session.commit()


async def authorize(database_url, request_key, job_id, recorded, reserve):
    # The worker is synchronous; each stage owns and closes its short DB connection.
    # No pooled connection is reused across asyncio.run() event loops.
    engine = create_async_engine(
        database_url, poolclass=NullPool, connect_args={"timeout": 5, "command_timeout": 5},
    )
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            await claim(session, request_key, job_id, recorded, reserve)
    finally:
        await engine.dispose()
