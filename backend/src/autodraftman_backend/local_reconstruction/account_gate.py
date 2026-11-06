"""Product authorization before a NEW stage; never changes upstream request inputs."""

import asyncio
import json
from decimal import Decimal


class AccountStagePaused(ValueError):
    def __init__(self, reason="check"):
        if reason not in ("budget", "permission", "check"):
            raise ValueError("Unknown account pause reason")
        self.code = f"account_{reason}_paused"
        super().__init__(self.code)


def retained_exposure(folder):
    total = Decimal(0)
    for path in folder.glob("**/receipt.json"):
        record = json.loads(path.read_text(encoding="utf-8"))
        for key in ("known_usd", "reserved_usd"):
            amount = record.get(key)
            if amount is None and key == "known_usd":
                continue
            if type(amount) not in (int, float):
                raise ValueError("Invalid retained billing")
            value = Decimal(str(amount))
            if not value.is_finite() or value < 0:
                raise ValueError("Invalid retained billing")
            total += value
        if record.get("known_usd") is None and not record.get("reserved_usd"):
            raise ValueError("Missing retained billing reserve")
    return total


def authorize_new_stage(settings, store, job_id, folder, reserve):
    if not settings.account_budgets_required:
        return
    try:
        if settings.account_settings_file is None or not settings.account_settings_file.is_file():
            raise ValueError("Account settings unavailable")
        from autodraftman_backend.core.config import Settings as AccountSettings
        from autodraftman_backend.modules.internal_access.stage_budget import authorize

        account_settings = AccountSettings(_env_file=settings.account_settings_file)
        asyncio.run(authorize(
            account_settings.database_url, store.request_key(job_id), job_id,
            retained_exposure(folder), Decimal(str(reserve)),
        ))
    except AccountStagePaused:
        raise
    except Exception as exc:
        # Fail closed without exposing database settings or sending a provider request.
        raise AccountStagePaused() from exc
