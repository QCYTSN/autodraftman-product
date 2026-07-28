from fastapi import APIRouter

from autodraftman_backend.api.dependencies import GuestPrincipalDependency, PrincipalDependency
from autodraftman_backend.modules.identity.schemas import CurrentIdentity, IdentityBalance

router = APIRouter(prefix="/identity", tags=["identity"])


def _serialize_identity(principal) -> CurrentIdentity:
    return CurrentIdentity(
        kind=principal.kind,
        id=principal.subject_id,
        expires_at=principal.expires_at,
        balance=IdentityBalance(
            available=principal.available_credits,
            reserved=principal.reserved_credits,
        ),
        display_name=principal.display_name,
        avatar_url=principal.avatar_url,
        providers=list(principal.providers),
    )


@router.post("/guest", response_model=CurrentIdentity)
async def create_or_restore_guest(
    principal: GuestPrincipalDependency,
) -> CurrentIdentity:
    return _serialize_identity(principal)


@router.get("/me", response_model=CurrentIdentity)
async def me(principal: PrincipalDependency) -> CurrentIdentity:
    return _serialize_identity(principal)
