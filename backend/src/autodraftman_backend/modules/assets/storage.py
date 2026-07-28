from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from io import BytesIO
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


@dataclass(frozen=True, slots=True)
class StoredImage:
    media_type: str
    byte_size: int
    width_px: int
    height_px: int
    checksum_sha256: str


class StorageValidationError(Exception):
    pass


def validate_image_bytes(
    data: bytes,
    *,
    allowed_media_types: frozenset[str],
    max_bytes: int,
    max_pixels: int,
) -> StoredImage:
    if not data:
        raise StorageValidationError("The uploaded file is empty.")
    if len(data) > max_bytes:
        raise StorageValidationError("The uploaded file exceeds the size limit.")

    try:
        from PIL import Image, UnidentifiedImageError

        with Image.open(BytesIO(data)) as image:
            width_px, height_px = image.size
            media_type = Image.MIME.get(image.format or "", "")
            if width_px <= 0 or height_px <= 0 or width_px * height_px > max_pixels:
                raise StorageValidationError("The uploaded image dimensions are not allowed.")
            image.verify()
    except StorageValidationError:
        raise
    except (ImportError, OSError, UnidentifiedImageError, ValueError) as exc:
        raise StorageValidationError("The uploaded file is not a valid image.") from exc

    if media_type not in allowed_media_types:
        raise StorageValidationError("The uploaded image format is not supported.")

    return StoredImage(
        media_type=media_type,
        byte_size=len(data),
        width_px=width_px,
        height_px=height_px,
        checksum_sha256=sha256(data).hexdigest(),
    )


class ObjectStorage(Protocol):
    def create_upload_request(
        self,
        *,
        object_key: str,
        media_type: str,
    ) -> PresignedRequest: ...

    def create_download_request(self, *, object_key: str) -> PresignedRequest: ...

    def inspect_image(
        self,
        *,
        object_key: str,
        allowed_media_types: frozenset[str],
        max_bytes: int,
        max_pixels: int,
    ) -> StoredImage: ...

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
        try:
            from botocore.config import Config
        except ImportError as exc:
            raise RuntimeError(
                "Install the 's3' optional dependency to use S3ObjectStorage."
            ) from exc

        client_options = {
            "region_name": settings.s3_region or None,
            "aws_access_key_id": settings.s3_access_key_id or None,
            "aws_secret_access_key": settings.s3_secret_access_key or None,
            "config": Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        }
        self.client: Any = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            **client_options,
        )
        self.presign_client: Any = boto3.client(
            "s3",
            endpoint_url=settings.s3_public_endpoint_url
            or settings.s3_endpoint_url
            or None,
            **client_options,
        )

    def create_upload_request(
        self,
        *,
        object_key: str,
        media_type: str,
    ) -> PresignedRequest:
        url = self.presign_client.generate_presigned_url(
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

    def create_download_request(self, *, object_key: str) -> PresignedRequest:
        url = self.presign_client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket, "Key": object_key},
            ExpiresIn=self.ttl_seconds,
            HttpMethod="GET",
        )
        return PresignedRequest(
            url=url,
            method="GET",
            headers={},
            expires_at=datetime.now(UTC) + timedelta(seconds=self.ttl_seconds),
        )

    def inspect_image(
        self,
        *,
        object_key: str,
        allowed_media_types: frozenset[str],
        max_bytes: int,
        max_pixels: int,
    ) -> StoredImage:
        try:
            from botocore.exceptions import ClientError
        except ImportError as exc:
            raise RuntimeError(
                "Install the 's3' optional dependency to use S3ObjectStorage."
            ) from exc

        try:
            response = self.client.get_object(Bucket=self.bucket, Key=object_key)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {
                "NoSuchKey",
                "NoSuchObject",
                "404",
            }:
                raise StorageValidationError("The uploaded object does not exist.") from exc
            raise

        body = response["Body"]
        try:
            data = body.read(max_bytes + 1)
        finally:
            body.close()

        return validate_image_bytes(
            data,
            allowed_media_types=allowed_media_types,
            max_bytes=max_bytes,
            max_pixels=max_pixels,
        )

    def delete(self, *, object_key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=object_key)
