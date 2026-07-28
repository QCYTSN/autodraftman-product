from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UploadIntentCreate(BaseModel):
    original_filename: str = Field(min_length=1, max_length=255)
    media_type: str = Field(min_length=1, max_length=127)
    byte_size: int = Field(gt=0)

    @field_validator("original_filename")
    @classmethod
    def normalize_filename(cls, value: str) -> str:
        filename = value.replace("\\", "/").rsplit("/", 1)[-1].strip()
        if not filename:
            raise ValueError("A filename is required.")
        return filename

    @field_validator("media_type")
    @classmethod
    def normalize_media_type(cls, value: str) -> str:
        return value.strip().lower()


class AssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str | None
    kind: str
    status: str
    media_type: str
    byte_size: int
    width_px: int | None
    height_px: int | None
    visibility: str
    created_at: datetime
    expires_at: datetime | None
    deleted_at: datetime | None


class AssetPage(BaseModel):
    items: list[AssetRead]
    limit: int
    offset: int


class PresignedRequestRead(BaseModel):
    url: str
    method: str
    headers: dict[str, str]
    expires_at: datetime


class UploadIntentRead(BaseModel):
    asset: AssetRead
    upload: PresignedRequestRead


class DownloadRead(BaseModel):
    url: str
    expires_at: datetime
