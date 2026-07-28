import uuid
from base64 import b64decode
from datetime import UTC, datetime, timedelta

import pytest

from autodraftman_backend.modules.assets.models import Asset
from autodraftman_backend.modules.assets.service import (
    AssetCompletionError,
    complete_reference_asset,
    schedule_asset_deletion,
)
from autodraftman_backend.modules.assets.storage import (
    StorageValidationError,
    build_object_key,
    validate_image_bytes,
)

ONE_PIXEL_PNG = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def test_object_key_uses_random_leaf_and_safe_suffix() -> None:
    owner_id = uuid.uuid4()
    asset_id = uuid.uuid4()

    first = build_object_key(
        owner_kind="guest",
        owner_id=owner_id,
        asset_id=asset_id,
        original_filename="../../Figure.PNG",
    )
    second = build_object_key(
        owner_kind="guest",
        owner_id=owner_id,
        asset_id=asset_id,
        original_filename="../../Figure.PNG",
    )

    assert first != second
    assert first.startswith(f"guest/{owner_id}/assets/{asset_id}/")
    assert first.endswith(".png")
    assert ".." not in first


def test_asset_deletion_is_immediate_but_physical_purge_is_scheduled() -> None:
    now = datetime(2026, 7, 28, 12, 0, tzinfo=UTC)
    asset = Asset(
        owner_user_id=uuid.uuid4(),
        owner_guest_id=None,
        storage_provider="s3",
        bucket="autodraftman",
        object_key="users/example/image.png",
        kind="result",
        status="ready",
        media_type="image/png",
        byte_size=100,
        visibility="private",
        deleted_at=None,
        expires_at=None,
        purge_after=None,
        purged_at=None,
    )

    schedule_asset_deletion(asset, now=now, purge_after_hours=24)

    assert asset.status == "deleted"
    assert asset.deleted_at == now
    assert asset.purge_after == now + timedelta(hours=24)


def test_image_bytes_are_verified_from_content() -> None:
    image = validate_image_bytes(
        ONE_PIXEL_PNG,
        allowed_media_types=frozenset({"image/png"}),
        max_bytes=1024,
        max_pixels=100,
    )

    assert image.media_type == "image/png"
    assert image.byte_size == len(ONE_PIXEL_PNG)
    assert (image.width_px, image.height_px) == (1, 1)
    assert len(image.checksum_sha256) == 64


def test_non_image_content_is_rejected() -> None:
    with pytest.raises(StorageValidationError, match="valid image"):
        validate_image_bytes(
            b"not really an image",
            allowed_media_types=frozenset({"image/png"}),
            max_bytes=1024,
            max_pixels=100,
        )


def test_completion_rejects_a_different_uploaded_size() -> None:
    asset = Asset(
        owner_user_id=uuid.uuid4(),
        owner_guest_id=None,
        storage_provider="s3",
        bucket="autodraftman",
        object_key="user/example/image.png",
        original_filename="image.png",
        kind="reference",
        status="pending",
        media_type="image/png",
        byte_size=len(ONE_PIXEL_PNG) + 1,
        width_px=None,
        height_px=None,
        visibility="private",
    )
    image = validate_image_bytes(
        ONE_PIXEL_PNG,
        allowed_media_types=frozenset({"image/png"}),
        max_bytes=1024,
        max_pixels=100,
    )

    with pytest.raises(AssetCompletionError, match="does not match"):
        complete_reference_asset(asset, image)
