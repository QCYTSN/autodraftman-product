from fastapi import APIRouter, Query

from autodraftman_backend.api.dependencies import PrincipalDependency, SessionDependency
from autodraftman_backend.modules.credits.schemas import (
    CreditBalance,
    CreditTransactionPage,
    CreditTransactionRead,
)
from autodraftman_backend.modules.credits.service import get_account, list_transactions

router = APIRouter(prefix="/credits", tags=["credits"])


@router.get("/balance", response_model=CreditBalance)
async def balance(
    principal: PrincipalDependency,
    session: SessionDependency,
) -> CreditBalance:
    account = await get_account(session, principal.account_id)
    return CreditBalance(
        available=account.available_credits,
        reserved=account.reserved_credits,
        total=account.available_credits + account.reserved_credits,
    )


@router.get("/transactions", response_model=CreditTransactionPage)
async def transactions(
    principal: PrincipalDependency,
    session: SessionDependency,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> CreditTransactionPage:
    items = await list_transactions(
        session,
        principal.account_id,
        limit=limit,
        offset=offset,
    )
    return CreditTransactionPage(
        items=[CreditTransactionRead.model_validate(item) for item in items],
        limit=limit,
        offset=offset,
    )
