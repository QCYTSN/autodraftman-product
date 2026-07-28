import uuid

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
