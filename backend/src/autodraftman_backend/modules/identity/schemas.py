from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class IdentityBalance(BaseModel):
    available: int
    reserved: int


class CurrentIdentity(BaseModel):
    kind: Literal["guest", "user"]
    id: uuid.UUID
    expires_at: datetime | None
    balance: IdentityBalance
    display_name: str | None = None
    avatar_url: str | None = None
    providers: list[str] = Field(default_factory=list)


class AuthProviderStatus(BaseModel):
    id: Literal["google", "github", "wechat"]
    name: str
    enabled: bool


class AuthProvidersResponse(BaseModel):
    providers: list[AuthProviderStatus]


class BoundIdentityResponse(BaseModel):
    provider: str
    email: str | None
    email_verified: bool
    created_at: datetime


class BoundIdentitiesResponse(BaseModel):
    identities: list[BoundIdentityResponse]
