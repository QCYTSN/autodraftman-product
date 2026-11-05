"""User-safe failure categories and conservative recovery eligibility."""

import json


def failure_details(job, error):
    message = str(error).lower()
    if "input bound before http" in message:
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
        calls += 1
        try:
            receipt = json.loads(path.read_text(encoding="utf-8"))
            known += float(receipt.get("known_usd") or 0)
            reserved += float(receipt.get("reserved_usd") or 0)
        except (ValueError, TypeError):
            return {"error": code, "failure": {"billing": "unknown", "retryable": False}}
    if reserved:
        code = "provider_unconfirmed" if code not in ("budget_exceeded", "timeout") else code
    return {
        "error": code,
        "failure": {
            "billing": "unconfirmed" if reserved else "recorded" if calls else "not_started",
            "costUsd": round(known, 6),
            "reservedUsd": round(reserved, 6),
            "retryable": calls == 0 and code in ("input_too_large", "preparation_failed"),
        },
    }


def can_retry(snapshot, folder):
    # No retry may hide a submitted or ambiguously charged request, regardless of UI state.
    return (
        snapshot["status"] == "failed"
        and (snapshot.get("failure") or {}).get("retryable") is True
        and snapshot.get("retryCount", 0) < 2
        and not any(folder.glob("**/receipt.json"))
    )
