from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str | None
    kind: str
    status: str
    media_type: str
    byte_size: int
    visibility: str
    created_at: datetime
    expires_at: datetime | None
    deleted_at: datetime | None


class AssetPage(BaseModel):
    items: list[AssetRead]
    limit: int
    offset: int
