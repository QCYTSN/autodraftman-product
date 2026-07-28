from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CreditBalance(BaseModel):
    available: int
    reserved: int
    total: int


class CreditTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    delta_available: int
    delta_reserved: int
    available_after: int
    reserved_after: int
    reason: str
    reference_type: str | None
    reference_id: uuid.UUID | None
    created_at: datetime


class CreditTransactionPage(BaseModel):
    items: list[CreditTransactionRead]
    limit: int
    offset: int
