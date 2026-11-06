"""User-safe failure categories and conservative recovery eligibility."""

import json

from .input_count import InputCountUnavailable
from .kernel_contract import KernelContractError
from .recovery import recovery_mode


def failure_details(job, error, stage=None):
    message = str(error).lower()
    if isinstance(error, InputCountUnavailable):
        code = "input_count_unavailable"
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
            calls += receipt.get("status") != "not_submitted"
            known += float(receipt.get("known_usd") or 0)
            reserved += float(receipt.get("reserved_usd") or 0)
        except (ValueError, TypeError):
            return {"error": code, "failure": {"billing": "unknown", "retryable": False}}
    if reserved:
        code = "provider_unconfirmed" if code not in ("budget_exceeded", "timeout") else code
    mode = recovery_mode({"status": "failed", "stage": stage, "error": code}, job)
    return {
        "error": code,
        "failure": {
            "billing": "unconfirmed" if reserved else "recorded" if calls else "not_started",
            "costUsd": round(known, 6),
            "reservedUsd": round(reserved, 6),
            "retryable": mode is not None,
            "resume": mode == "resume",
        },
    }


def can_retry(snapshot, folder):
    return (snapshot.get("failure") or {}).get("retryable") is True and recovery_mode(
        snapshot, folder
    ) is not None
