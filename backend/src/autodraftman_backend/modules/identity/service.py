from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from autodraftman_backend.core.config import Settings
from autodraftman_backend.core.security import hash_opaque_token, new_opaque_token
from autodraftman_backend.modules.assets.models import Asset
from autodraftman_backend.modules.credits.models import CreditAccount, CreditTransaction
from autodraftman_backend.modules.drafts.models import Draft
from autodraftman_backend.modules.feedback.models import Feedback
from autodraftman_backend.modules.identity.models import (
    AuthIdentity,
    GuestIdentity,
    User,
    UserSession,
)


class IdentityConflictError(Exception):
    pass


class LastIdentityError(Exception):
    pass


class GuestMergeError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class AccountDeletionReceipt:
    requested_at: datetime
    purge_after: datetime


@dataclass(frozen=True, slots=True)
class Principal:
    kind: Literal["guest", "user"]
    subject_id: uuid.UUID
    account_id: uuid.UUID
    available_credits: int
    reserved_credits: int
    expires_at: datetime | None
    display_name: str | None = None
    avatar_url: str | None = None
    providers: tuple[str, ...] = ()
    default_visibility: Literal["private", "public"] = "private"


@dataclass(frozen=True, slots=True)
class ExternalIdentityProfile:
    provider: str
    issuer: str
    subject: str
    email: str | None
    email_verified: bool
    display_name: str | None
    avatar_url: str | None


@dataclass(frozen=True, slots=True)
class BoundIdentity:
    provider: str
    email: str | None
    email_verified: bool
    created_at: datetime


async def _find_active_guest(
    session: AsyncSession,
    raw_guest_token: str,
    now: datetime,
) -> tuple[GuestIdentity, CreditAccount] | None:
    result = await session.execute(
        select(GuestIdentity, CreditAccount)
        .join(CreditAccount, CreditAccount.guest_id == GuestIdentity.id)
        .where(
            GuestIdentity.token_hash == hash_opaque_token(raw_guest_token),
            GuestIdentity.expires_at > now,
            GuestIdentity.converted_user_id.is_(None),
        )
    )
    row = result.one_or_none()
    if row is None:
        return None
    guest, account = row
    return guest, account


async def _provider_names(session: AsyncSession, user_id: uuid.UUID) -> tuple[str, ...]:
    result = await session.scalars(
        select(AuthIdentity.provider)
        .where(AuthIdentity.user_id == user_id)
        .order_by(AuthIdentity.provider)
    )
    return tuple(result.all())


async def _find_active_user(
    session: AsyncSession,
    raw_session_token: str,
    now: datetime,
) -> tuple[UserSession, User, CreditAccount] | None:
    result = await session.execute(
        select(UserSession, User, CreditAccount)
        .join(User, User.id == UserSession.user_id)
        .join(CreditAccount, CreditAccount.user_id == User.id)
        .where(
            UserSession.token_hash == hash_opaque_token(raw_session_token),
            UserSession.expires_at > now,
            UserSession.revoked_at.is_(None),
            User.is_active.is_(True),
        )
    )
    row = result.one_or_none()
    if row is None:
        return None
    user_session, user, account = row
    return user_session, user, account


async def _create_guest(
    session: AsyncSession,
    settings: Settings,
    now: datetime,
) -> tuple[GuestIdentity, CreditAccount, str]:
    raw_token = new_opaque_token()
    guest = GuestIdentity(
        token_hash=hash_opaque_token(raw_token),
        expires_at=now + timedelta(days=settings.guest_ttl_days),
        last_seen_at=now,
    )
    session.add(guest)
    await session.flush()

    account = CreditAccount(
        guest_id=guest.id,
        available_credits=settings.guest_initial_credits,
        reserved_credits=0,
        version=1,
    )
    session.add(account)
    await session.flush()

    if settings.guest_initial_credits > 0:
        session.add(
            CreditTransaction(
                account_id=account.id,
                kind="grant",
                delta_available=settings.guest_initial_credits,
                delta_reserved=0,
                available_after=settings.guest_initial_credits,
                reserved_after=0,
                reason="Initial guest allowance",
                reference_type="guest_identity",
                reference_id=guest.id,
                idempotency_key=f"guest-initial-grant:{guest.id}",
            )
        )

    await session.commit()
    return guest, account, raw_token


async def resolve_principal(
    session: AsyncSession,
    raw_guest_token: str | None,
    raw_session_token: str | None,
    settings: Settings,
) -> Principal | None:
    now = datetime.now(UTC)

    if raw_session_token:
        found_user = await _find_active_user(session, raw_session_token, now)
        if found_user is not None:
            user_session, user, account = found_user
            if user_session.last_seen_at < now - timedelta(minutes=15):
                user_session.last_seen_at = now
                await session.commit()
            return Principal(
                kind="user",
                subject_id=user.id,
                account_id=account.id,
                available_credits=account.available_credits,
                reserved_credits=account.reserved_credits,
                expires_at=user_session.expires_at,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
                providers=await _provider_names(session, user.id),
                default_visibility=user.default_visibility,
            )

    if not raw_guest_token:
        return None

    found_guest = await _find_active_guest(session, raw_guest_token, now)
    if found_guest is None:
        return None

    guest, account = found_guest
    if guest.last_seen_at < now - timedelta(minutes=15):
        guest.last_seen_at = now
        await session.commit()
    return Principal(
        kind="guest",
        subject_id=guest.id,
        account_id=account.id,
        available_credits=account.available_credits,
        reserved_credits=account.reserved_credits,
        expires_at=guest.expires_at,
    )


async def resolve_or_create_guest(
    session: AsyncSession,
    raw_guest_token: str | None,
    raw_session_token: str | None,
    settings: Settings,
) -> tuple[Principal, str | None]:
    principal = await resolve_principal(
        session,
        raw_guest_token=raw_guest_token,
        raw_session_token=raw_session_token,
        settings=settings,
    )
    if principal is not None:
        return principal, None

    now = datetime.now(UTC)
    guest, account, new_token = await _create_guest(session, settings, now)
    return (
        Principal(
            kind="guest",
            subject_id=guest.id,
            account_id=account.id,
            available_credits=account.available_credits,
            reserved_credits=account.reserved_credits,
            expires_at=guest.expires_at,
        ),
        new_token,
    )


async def create_user_session(
    session: AsyncSession,
    user_id: uuid.UUID,
    settings: Settings,
    now: datetime,
) -> tuple[str, datetime]:
    raw_token = new_opaque_token()
    expires_at = now + timedelta(days=settings.session_ttl_days)
    session.add(
        UserSession(
            user_id=user_id,
            token_hash=hash_opaque_token(raw_token),
            expires_at=expires_at,
            last_seen_at=now,
        )
    )
    await session.flush()
    return raw_token, expires_at


async def revoke_user_session(
    session: AsyncSession,
    raw_session_token: str | None,
    now: datetime,
) -> None:
    if not raw_session_token:
        return
    await session.execute(
        update(UserSession)
        .where(
            UserSession.token_hash == hash_opaque_token(raw_session_token),
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )


async def request_account_deletion(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    now: datetime,
    asset_delete_grace_hours: int,
    account_purge_days: int,
) -> AccountDeletionReceipt:
    user = await session.get(User, user_id, with_for_update=True)
    if user is None or not user.is_active:
        raise IdentityConflictError("The account is no longer active.")

    purge_after = now + timedelta(days=account_purge_days)
    await session.execute(
        update(Asset)
        .where(
            Asset.owner_user_id == user_id,
            Asset.deleted_at.is_(None),
        )
        .values(
            status="deleted",
            deleted_at=now,
            purge_after=now + timedelta(hours=asset_delete_grace_hours),
        )
    )
    await session.execute(
        update(Draft)
        .where(
            Draft.owner_user_id == user_id,
            Draft.deleted_at.is_(None),
        )
        .values(deleted_at=now)
    )
    await session.execute(delete(AuthIdentity).where(AuthIdentity.user_id == user_id))
    await session.execute(
        update(UserSession)
        .where(
            UserSession.user_id == user_id,
            UserSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    user.display_name = None
    user.avatar_url = None
    user.is_active = False
    user.deletion_requested_at = now
    user.purge_after = purge_after
    await session.flush()
    return AccountDeletionReceipt(requested_at=now, purge_after=purge_after)


async def _get_or_create_user_account(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> CreditAccount:
    account = await session.scalar(
        select(CreditAccount).where(CreditAccount.user_id == user_id).with_for_update()
    )
    if account is not None:
        return account
    account = CreditAccount(
        user_id=user_id,
        available_credits=0,
        reserved_credits=0,
        version=1,
    )
    session.add(account)
    await session.flush()
    return account


async def merge_guest_into_user(
    session: AsyncSession,
    guest_id: uuid.UUID,
    user: User,
    now: datetime,
) -> None:
    guest = await session.scalar(
        select(GuestIdentity).where(GuestIdentity.id == guest_id).with_for_update()
    )
    if guest is None or guest.converted_user_id is not None:
        return

    guest_account = await session.scalar(
        select(CreditAccount)
        .where(CreditAccount.guest_id == guest.id)
        .with_for_update()
    )
    user_account = await _get_or_create_user_account(session, user.id)

    if guest_account is not None and guest_account.reserved_credits:
        raise GuestMergeError("A guest account with reserved credits cannot be converted.")

    await session.execute(
        update(Asset)
        .where(Asset.owner_guest_id == guest.id)
        .values(owner_guest_id=None, owner_user_id=user.id)
    )
    await session.execute(
        update(Draft)
        .where(Draft.owner_guest_id == guest.id)
        .values(owner_guest_id=None, owner_user_id=user.id, expires_at=None)
    )
    await session.execute(
        update(Feedback)
        .where(Feedback.owner_guest_id == guest.id)
        .values(owner_guest_id=None, owner_user_id=user.id)
    )

    transferable = 0
    if guest_account is not None and user.guest_trial_claimed_at is None:
        transferable = guest_account.available_credits
        user.guest_trial_claimed_at = now

    if guest_account is not None and guest_account.available_credits:
        removed = guest_account.available_credits
        guest_account.available_credits = 0
        session.add(
            CreditTransaction(
                account_id=guest_account.id,
                kind="adjustment",
                delta_available=-removed,
                delta_reserved=0,
                available_after=0,
                reserved_after=0,
                reason="Guest account converted to a registered user",
                reference_type="user",
                reference_id=user.id,
                idempotency_key=f"guest-conversion-debit:{guest.id}",
            )
        )

    if transferable:
        user_account.available_credits += transferable
        session.add(
            CreditTransaction(
                account_id=user_account.id,
                kind="grant",
                delta_available=transferable,
                delta_reserved=0,
                available_after=user_account.available_credits,
                reserved_after=user_account.reserved_credits,
                reason="Transferred initial guest allowance",
                reference_type="guest_identity",
                reference_id=guest.id,
                idempotency_key=f"guest-conversion-credit:{guest.id}",
            )
        )

    guest.converted_user_id = user.id


async def grant_initial_user_allowance(
    session: AsyncSession,
    user: User,
    settings: Settings,
    now: datetime,
) -> None:
    if user.guest_trial_claimed_at is not None:
        return

    account = await _get_or_create_user_account(session, user.id)
    amount = settings.guest_initial_credits
    user.guest_trial_claimed_at = now
    if amount <= 0:
        return

    account.available_credits += amount
    session.add(
        CreditTransaction(
            account_id=account.id,
            kind="grant",
            delta_available=amount,
            delta_reserved=0,
            available_after=account.available_credits,
            reserved_after=account.reserved_credits,
            reason="Initial registered user allowance",
            reference_type="user",
            reference_id=user.id,
            idempotency_key=f"user-initial-grant:{user.id}",
        )
    )


async def find_or_create_user_for_profile(
    session: AsyncSession,
    profile: ExternalIdentityProfile,
    target_user_id: uuid.UUID | None,
) -> tuple[User, bool]:
    identity = await session.scalar(
        select(AuthIdentity)
        .where(
            AuthIdentity.provider == profile.provider,
            AuthIdentity.issuer == profile.issuer,
            AuthIdentity.provider_subject == profile.subject,
        )
        .with_for_update()
    )

    if target_user_id is not None:
        existing_for_provider = await session.scalar(
            select(AuthIdentity).where(
                AuthIdentity.user_id == target_user_id,
                AuthIdentity.provider == profile.provider,
            )
        )
        if identity is not None and identity.user_id != target_user_id:
            raise IdentityConflictError("This login identity belongs to another account.")
        if existing_for_provider is not None and (
            identity is None or existing_for_provider.id != identity.id
        ):
            raise IdentityConflictError(
                f"A different {profile.provider} identity is already linked."
            )

        user = await session.get(User, target_user_id)
        if user is None or not user.is_active:
            raise IdentityConflictError("The account is no longer active.")
        created = False
    elif identity is not None:
        user = await session.get(User, identity.user_id)
        if user is None or not user.is_active:
            raise IdentityConflictError("The account is no longer active.")
        created = False
    else:
        user = User(
            display_name=profile.display_name,
            avatar_url=profile.avatar_url,
        )
        session.add(user)
        await session.flush()
        await _get_or_create_user_account(session, user.id)
        created = True

    if identity is None:
        session.add(
            AuthIdentity(
                user_id=user.id,
                provider=profile.provider,
                issuer=profile.issuer,
                provider_subject=profile.subject,
                email=profile.email,
                email_verified=profile.email_verified,
            )
        )
    else:
        identity.email = profile.email
        identity.email_verified = profile.email_verified

    if not user.display_name and profile.display_name:
        user.display_name = profile.display_name
    if not user.avatar_url and profile.avatar_url:
        user.avatar_url = profile.avatar_url
    await session.flush()
    return user, created


async def list_bound_identities(
    session: AsyncSession,
    user_id: uuid.UUID,
) -> list[BoundIdentity]:
    identities = (
        await session.scalars(
            select(AuthIdentity)
            .where(AuthIdentity.user_id == user_id)
            .order_by(AuthIdentity.created_at)
        )
    ).all()
    return [
        BoundIdentity(
            provider=identity.provider,
            email=identity.email,
            email_verified=identity.email_verified,
            created_at=identity.created_at,
        )
        for identity in identities
    ]


async def unlink_identity(
    session: AsyncSession,
    user_id: uuid.UUID,
    provider: str,
) -> None:
    identities = (
        await session.scalars(
            select(AuthIdentity)
            .where(AuthIdentity.user_id == user_id)
            .with_for_update()
        )
    ).all()
    target = next((identity for identity in identities if identity.provider == provider), None)
    if target is None:
        return
    if len(identities) <= 1:
        raise LastIdentityError("At least one login method must remain linked.")
    await session.delete(target)
    await session.flush()
