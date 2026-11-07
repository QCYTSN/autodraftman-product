"""Account admission control only; the original run and its $5 cap are unchanged."""

from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlalchemy import func, select

from .models import InternalAccount, OwnedReconstruction

RUN_RESERVE = Decimal("5")


async def lock_account(session, user_id):
    return await session.scalar(
        select(InternalAccount).where(InternalAccount.user_id == user_id)
        .with_for_update().execution_options(populate_existing=True)
    )


def terminal_exposure(item):
    """Unknown/malformed billing keeps the full hold, including lost responses."""
    if item.get("status") == "succeeded":
        bill = item.get("result") or {}
        amounts = (bill.get("knownCostUsd"), bill.get("reservedCostUsd"))
    elif item.get("status") == "failed":
        bill = item.get("failure") or {}
        amounts = (bill.get("costUsd"), bill.get("reservedUsd"))
    else:
        return None
    try:
        values = [Decimal(str(value)) for value in amounts]
        if any(not value.is_finite() or value < 0 for value in values):
            return None
        return sum(values, Decimal(0))
    except (InvalidOperation, ValueError):
        return None


async def refresh(session, account, settings, bridge):
    # Caller holds the account row lock. Settled jobs need no network calls;
    # all jobs (including those beyond the history page) still count toward usage.
    pending = list(await session.scalars(select(OwnedReconstruction).where(
        OwnedReconstruction.user_id == account.user_id,
        OwnedReconstruction.budget_pending.is_(True),
        OwnedReconstruction.bridge_job_id.is_not(None),
    )))
    for owned in pending:
        try:
            item = (await bridge(settings, "GET", f"/jobs/{owned.bridge_job_id}")).json()
            if (item.get("id") != owned.bridge_job_id
                    or type(item.get("revision")) is not int
                    or item["revision"] <= owned.budget_retry_revision):
                continue
            amount = terminal_exposure(item)
        except (HTTPException, ValueError, AttributeError):
            continue
        if amount is not None:
            owned.budget_exposure_usd = amount
            owned.budget_pending = False
    await session.flush()
    return await usage(session, account)


async def usage(session, account):
    return await session.scalar(select(func.coalesce(
        func.sum(OwnedReconstruction.budget_exposure_usd), 0,
    )).where(OwnedReconstruction.user_id == account.user_id))


async def reserve(session, account, owned):
    used = await usage(session, account)
    additional = max(Decimal(0), RUN_RESERVE - owned.budget_exposure_usd)
    if used + additional > account.budget_limit_usd:
        raise HTTPException(429, "此账号剩余额度不足以预留一次重建，请联系管理员。")
    owned.budget_exposure_usd += additional
    owned.budget_pending = True


def release_rejected(owned):
    # Only use after a definite rejection before any job was created.
    owned.budget_exposure_usd = Decimal(0)
    owned.budget_pending = False
