"""Local administrator CLI. Credentials are read interactively or from stdin, never argv."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import json
import sys
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select, update

from autodraftman_backend.core.database import SessionFactory, dispose_engine
from autodraftman_backend.modules.credits.models import CreditAccount
from autodraftman_backend.modules.identity.models import AuthIdentity, User, UserSession
from autodraftman_backend.modules.internal_access.models import InternalAccount
from autodraftman_backend.modules.internal_access.passwords import hash_password

USERNAMES = tuple(f"figfox{number:02d}" for number in range(1, 5))


async def provision(credentials: dict[str, str]) -> None:
    if set(credentials) != set(USERNAMES):
        raise ValueError("Provide exactly figfox01 through figfox04")
    hashes = {name: hash_password(password) for name, password in credentials.items()}
    async with SessionFactory() as session:
        for name, encoded in hashes.items():
            account = await session.scalar(
                select(InternalAccount)
                .where(
                    InternalAccount.username == name,
                )
                .with_for_update()
            )
            if account is None:
                user = User(display_name=name, is_active=True)
                session.add(user)
                await session.flush()
                session.add_all(
                    [
                        CreditAccount(user_id=user.id),
                        AuthIdentity(
                            user_id=user.id,
                            provider="password",
                            issuer="figfox-internal",
                            provider_subject=name,
                        ),
                    ]
                )
                account = InternalAccount(user_id=user.id, username=name)
                session.add(account)
            # Rerunning provisioning rotates passwords and revokes old sessions deliberately.
            account.password_hash = encoded
            account.enabled = True
            account.generation_allowed = True
            await session.execute(
                update(UserSession)
                .where(
                    UserSession.user_id == account.user_id,
                    UserSession.revoked_at.is_(None),
                )
                .values(revoked_at=datetime.now(UTC))
            )
        await session.commit()


async def disable(username: str) -> None:
    async with SessionFactory() as session:
        account = await session.scalar(
            select(InternalAccount)
            .where(
                InternalAccount.username == username,
            )
            .with_for_update()
        )
        if account is None:
            raise ValueError("Unknown internal account")
        account.enabled = False
        account.generation_allowed = False
        await session.execute(
            update(UserSession)
            .where(
                UserSession.user_id == account.user_id,
            )
            .values(revoked_at=datetime.now(UTC))
        )
        await session.commit()


async def set_budget(limit: Decimal) -> None:
    if not limit.is_finite() or limit < 0 or limit > Decimal("100000"):
        raise ValueError("Budget must be between 0 and 100000 USD")
    async with SessionFactory() as session:
        accounts = list(await session.scalars(select(InternalAccount).where(
            InternalAccount.username.in_(USERNAMES),
        ).order_by(InternalAccount.username).with_for_update()))
        if len(accounts) != 4:
            raise ValueError("Provision the four accounts before setting budgets")
        for account in accounts:
            account.budget_limit_usd = limit
        await session.commit()


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["provision", "disable", "budget"])
    parser.add_argument("--limit-usd", type=Decimal)
    parser.add_argument("--stdin-json", action="store_true")
    parser.add_argument("--username", choices=USERNAMES)
    args = parser.parse_args()
    try:
        if args.action == "provision":
            credentials = (
                json.load(sys.stdin)
                if args.stdin_json
                else {name: getpass.getpass(f"{name} password: ") for name in USERNAMES}
            )
            await provision(credentials)
            print("Provisioned: " + ", ".join(USERNAMES))
        elif args.action == "budget":
            if args.limit_usd is None:
                parser.error("budget requires --limit-usd")
            await set_budget(args.limit_usd)
            print(f"Account caps updated to {args.limit_usd} USD; existing usage retained.")
        else:
            if not args.username:
                parser.error("disable requires --username")
            await disable(args.username)
            print(f"Disabled: {args.username}")
    finally:
        await dispose_engine()


if __name__ == "__main__":
    asyncio.run(main())
