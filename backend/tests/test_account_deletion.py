import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from autodraftman_backend.modules.identity.models import User
from autodraftman_backend.modules.identity.service import request_account_deletion


@pytest.mark.asyncio
async def test_account_deletion_anonymizes_user_and_schedules_purge() -> None:
    user_id = uuid.uuid4()
    now = datetime(2026, 7, 28, 12, 0, tzinfo=UTC)
    user = User(
        id=user_id,
        display_name="Researcher",
        avatar_url="https://example.test/avatar.png",
        is_active=True,
    )
    session = AsyncMock()
    session.get.return_value = user

    receipt = await request_account_deletion(
        session,
        user_id=user_id,
        now=now,
        asset_delete_grace_hours=24,
        account_purge_days=30,
    )

    assert receipt.requested_at == now
    assert receipt.purge_after == now + timedelta(days=30)
    assert user.display_name is None
    assert user.avatar_url is None
    assert user.is_active is False
    assert user.deletion_requested_at == now
    assert user.purge_after == now + timedelta(days=30)
    assert session.execute.await_count == 4
    session.flush.assert_awaited_once()
