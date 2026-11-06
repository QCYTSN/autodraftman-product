"""User-safe failure categories and conservative recovery eligibility."""

import json
import math

from .account_gate import AccountStagePaused
from .background import (
    BackgroundExpired,
    BackgroundIdentityError,
    BackgroundPending,
    BackgroundRejected,
)
from .input_count import InputCountUnavailable
from .kernel_contract import KernelContractError
from .recovery import ACCOUNT_PAUSES, REPLAY_MODES, recovery_mode


def failure_details(job, error, stage=None):
    message = str(error).lower()
    if isinstance(error, AccountStagePaused):
        code = error.code
    elif isinstance(error, InputCountUnavailable):
        code = "input_count_unavailable"
    elif isinstance(error, BackgroundPending):
        code = "background_pending"
    elif isinstance(error, BackgroundRejected):
        code = "background_rejected"
    elif isinstance(error, BackgroundExpired):
        code = "background_expired"
    elif isinstance(error, BackgroundIdentityError):
        code = "background_identity_mismatch"
    elif isinstance(error, InterruptedError):
        code = "interrupted"
    elif isinstance(error, KernelContractError) or "original contract mismatch" in message:
        code = "original_contract_mismatch"
    elif "original prompt unsupported" in message:
        code = "original_prompt_unsupported"
    elif "input bound before http" in message:
        code = "input_too_large"
    elif "budget" in message:
        code = "budget_exceeded"
    elif "sam preparation failed" in message:
        code = "preparation_failed"
    elif "timeout" in message or isinstance(error, TimeoutError):
        code = "timeout"
    else:
        code = "kernel_failed"
    known, reserved, calls = 0.0, 0.0, 0
    for path in job.glob("**/receipt.json"):
        try:
            receipt = json.loads(path.read_text(encoding="utf-8"))
            for amount in (receipt.get("known_usd"), receipt.get("reserved_usd")):
                if amount is not None and (
                    type(amount) not in (int, float) or not math.isfinite(amount) or amount < 0
                ):
                    raise ValueError("Invalid receipt amount")
            calls += receipt.get("status") != "not_submitted"
            known += float(receipt.get("known_usd") or 0)
            reserved += float(receipt.get("reserved_usd") or 0)
        except (OSError, ValueError, TypeError, AttributeError):
            return {"error": code, "failure": {"billing": "unknown", "retryable": False}}
    if reserved:
        code = (
            "provider_unconfirmed"
            if code
            not in (
                "budget_exceeded",
                "timeout",
                "background_pending",
                "background_rejected",
                "background_expired",
                "background_identity_mismatch",
                *ACCOUNT_PAUSES,
            )
            else code
        )
    mode = recovery_mode({"status": "failed", "stage": stage, "error": code}, job)
    return {
        "error": code,
        "failure": {
            "billing": "unconfirmed" if reserved else "recorded" if calls else "not_started",
            "costUsd": round(known, 6),
            "reservedUsd": round(reserved, 6),
            "retryable": mode is not None,
            "resume": mode in ("resume", *REPLAY_MODES),
        },
    }


def can_retry(snapshot, folder):
    # Older snapshots may have cached the former, incomplete recovery decision.
    # Re-evaluate verified artifacts; never alter their receipts or failure billing.
    return recovery_mode(snapshot, folder) is not None
