import uuid
from datetime import UTC, datetime, timedelta

from autodraftman_backend.modules.assets.models import Asset
from autodraftman_backend.modules.assets.service import schedule_asset_deletion
from autodraftman_backend.modules.assets.storage import build_object_key


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
