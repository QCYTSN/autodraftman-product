from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DraftMode = Literal["text", "reference"]
DraftRatio = Literal["16:9", "4:3", "1:1"]
DraftFormat = Literal["PNG", "JPG", "WebP"]
DraftVisibility = Literal["private", "public"]


class DraftFields(BaseModel):
    prompt: str = Field(default="", max_length=1200)
    mode: DraftMode = "text"
    aspect_ratio: DraftRatio = "16:9"
    output_format: DraftFormat = "PNG"
    visibility: DraftVisibility = "private"
    reference_asset_id: uuid.UUID | None = None

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, value: str) -> str:
        return value.replace("\r\n", "\n")

    @model_validator(mode="after")
    def reference_requires_reference_mode(self) -> DraftFields:
        if self.mode == "text":
            self.reference_asset_id = None
        return self


class DraftCreate(DraftFields):
    pass


class DraftUpdate(BaseModel):
    prompt: str | None = Field(default=None, max_length=1200)
    mode: DraftMode | None = None
    aspect_ratio: DraftRatio | None = None
    output_format: DraftFormat | None = None
    visibility: DraftVisibility | None = None
    reference_asset_id: uuid.UUID | None = None
    reference_asset_set: bool = False

    @field_validator("prompt")
    @classmethod
    def normalize_prompt(cls, value: str | None) -> str | None:
        return value.replace("\r\n", "\n") if value is not None else None


class DraftRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    prompt: str
    mode: DraftMode
    aspect_ratio: DraftRatio
    output_format: DraftFormat
    visibility: DraftVisibility
    reference_asset_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None


class DraftPage(BaseModel):
    items: list[DraftRead]
    limit: int
    offset: int
