from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import PurePath
from typing import Any, Protocol

from autodraftman_backend.core.config import Settings

SAFE_SUFFIX = re.compile(r"^\.[a-z0-9]{1,10}$")


@dataclass(frozen=True, slots=True)
class PresignedRequest:
    url: str
    method: str
    headers: dict[str, str]
    expires_at: datetime


class ObjectStorage(Protocol):
    def create_upload_request(
        self,
        *,
        object_key: str,
        media_type: str,
    ) -> PresignedRequest: ...

    def create_download_url(self, *, object_key: str) -> str: ...

    def delete(self, *, object_key: str) -> None: ...


def build_object_key(
    *,
    owner_kind: str,
    owner_id: uuid.UUID,
    asset_id: uuid.UUID,
    original_filename: str | None,
) -> str:
    suffix = PurePath(original_filename or "").suffix.lower()
    if not SAFE_SUFFIX.fullmatch(suffix):
        suffix = ""
    random_leaf = uuid.uuid4()
    return f"{owner_kind}/{owner_id}/assets/{asset_id}/{random_leaf}{suffix}"


class S3ObjectStorage:
    def __init__(self, settings: Settings) -> None:
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError(
                "Install the 's3' optional dependency to use S3ObjectStorage."
            ) from exc

        self.bucket = settings.s3_bucket
        self.ttl_seconds = settings.s3_presign_ttl_seconds
        self.client: Any = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            region_name=settings.s3_region or None,
            aws_access_key_id=settings.s3_access_key_id or None,
            aws_secret_access_key=settings.s3_secret_access_key or None,
        )

    def create_upload_request(
        self,
        *,
        object_key: str,
        media_type: str,
    ) -> PresignedRequest:
        url = self.client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.bucket,
                "Key": object_key,
                "ContentType": media_type,
            },
            ExpiresIn=self.ttl_seconds,
            HttpMethod="PUT",
        )
        return PresignedRequest(
            url=url,
            method="PUT",
            headers={"Content-Type": media_type},
            expires_at=datetime.now(UTC) + timedelta(seconds=self.ttl_seconds),
        )

    def create_download_url(self, *, object_key: str) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket, "Key": object_key},
            ExpiresIn=self.ttl_seconds,
            HttpMethod="GET",
        )

    def delete(self, *, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)
