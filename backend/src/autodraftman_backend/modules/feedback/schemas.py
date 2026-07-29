from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

FeedbackCategory = Literal["product", "bug", "account", "other"]
FeedbackStatus = Literal["received", "in_review", "resolved", "closed"]
FeedbackLocale = Literal["zh", "en"]


class FeedbackCreate(BaseModel):
    category: FeedbackCategory
    message: str = Field(min_length=10, max_length=4000)
    contact_email: str | None = Field(default=None, max_length=320)
    page_url: str | None = Field(default=None, max_length=2048)
    locale: FeedbackLocale = "zh"

    @field_validator("message")
    @classmethod
    def normalize_message(cls, value: str) -> str:
        normalized = value.strip().replace("\r\n", "\n")
        if len(normalized) < 10:
            raise ValueError("Feedback must contain at least 10 characters")
        return normalized

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address")
        return normalized


class FeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    category: FeedbackCategory
    message: str
    contact_email: str | None
    page_url: str | None
    locale: FeedbackLocale
    status: FeedbackStatus
    created_at: datetime
    updated_at: datetime


class FeedbackPage(BaseModel):
    items: list[FeedbackRead]
    limit: int
    offset: int
