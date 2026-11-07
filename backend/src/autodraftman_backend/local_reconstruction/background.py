"""One creation per stage; persist its ID before polling or returning control.

Only retrieval may retry. Unknown creations without an ID are never resubmitted.
The kernel still builds inputs, parses the final response and settles its receipt.
"""

import hashlib
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from uuid import uuid4

ENDPOINT = "https://api.openai.com/v1/responses"
VERSION = "responses-background-v2"
RESPONSE_ID = re.compile(r"resp_[A-Za-z0-9_-]{1,200}\Z")
POLL_INTERVAL = 2
MAX_GET_ERRORS = 3


class BackgroundPending(ValueError):
    """A submitted request has not yet yielded a verified complete response."""


class BackgroundRejected(ValueError):
    pass


class BackgroundExpired(ValueError):
    pass


class BackgroundIdentityError(ValueError):
    pass


def _digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def _write(path, value):
    temporary = path.with_name(path.name + "." + uuid4().hex + ".tmp")
    try:
        with temporary.open("w", encoding="utf-8") as file:
            json.dump(value, file, ensure_ascii=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _read(path):
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise BackgroundIdentityError("Invalid background state")
    return value


def _bound_task(folder, receipt):
    task = _read(folder / "provider-task.json")
    if (
        task.get("version") != VERSION
        or task.get("endpoint") != ENDPOINT
        or task.get("model") != "gpt-5.5"
        or not isinstance(task.get("response_id"), str)
        or not RESPONSE_ID.fullmatch(task["response_id"])
        or not isinstance(receipt.get("request_id"), str)
        or not receipt["request_id"].strip()
        or not re.fullmatch(r"[a-f0-9]{64}", str(receipt.get("input_sha256", "")))
        or task.get("request_id") != receipt.get("request_id")
        or task.get("input_sha256") != receipt.get("input_sha256")
        or not re.fullmatch(r"[a-f0-9]{64}", str(task.get("request_sha256", "")))
    ):
        raise BackgroundIdentityError("Background request identity mismatch")
    return task


def resumable_task(folder, receipt=None):
    """No network or age guesses: only an ID bound to this frozen request qualifies."""
    folder = Path(folder)
    try:
        receipt = receipt if receipt is not None else _read(folder / "receipt.json")
        task = _bound_task(folder, receipt)
        return receipt.get("status") == "uncertain" and task.get("status") in (
            "queued",
            "in_progress",
            "completed",
        )
    except (OSError, ValueError, TypeError, KeyError):
        return False


def _validate_identity(raw, response_id=None):
    if (
        not isinstance(raw, dict)
        or not isinstance(raw.get("id"), str)
        or not RESPONSE_ID.fullmatch(raw["id"])
        or response_id is not None
        and raw["id"] != response_id
        or raw.get("status")
        not in (
            "queued",
            "in_progress",
            "completed",
            "failed",
            "cancelled",
            "incomplete",
        )
    ):
        raise BackgroundIdentityError("Invalid background provider response")


def _validate_response(raw, response_id=None):
    _validate_identity(raw, response_id)
    model = raw.get("model")
    if model is not None and (
        not isinstance(model, str) or model != "gpt-5.5" and not model.startswith("gpt-5.5-")
    ):
        raise BackgroundIdentityError("Unexpected response model")
    usage = raw.get("usage")
    if usage is not None:
        if not isinstance(usage, dict):
            raise BackgroundIdentityError("Invalid response usage")
        for key in ("input_tokens", "output_tokens"):
            if type(usage.get(key)) is not int or usage[key] < 0:
                raise BackgroundIdentityError("Invalid token usage")
        details = usage.get("input_tokens_details")
        if details is not None and not isinstance(details, dict):
            raise BackgroundIdentityError("Invalid token usage details")
        cached = (details or {}).get("cached_tokens", 0)
        if type(cached) is not int or not 0 <= cached <= usage["input_tokens"]:
            raise BackgroundIdentityError("Invalid cached token usage")


def background_response(body, settings, folder):
    folder = Path(folder)
    if (
        settings.get("endpoint") != ENDPOINT
        or settings.get("protocol") != "responses"
        or settings.get("model") != "gpt-5.5"
        or body.get("model") != "gpt-5.5"
        or body.get("store") is not False
    ):
        raise BackgroundIdentityError("Unsupported background provider or retention setting")
    key = os.environ.get(settings["key_env"])
    if not key:
        raise BackgroundPending("Missing credential for the existing request")
    payload = {**body, "background": True}
    receipt = _read(folder / "receipt.json")
    binding = {
        "version": VERSION,
        "endpoint": ENDPOINT,
        "model": settings["model"],
        "request_id": receipt["request_id"],
        "input_sha256": receipt["input_sha256"],
        "request_sha256": _digest(payload),
    }
    task_path = folder / "provider-task.json"
    submission_path = folder / "background-submission.json"
    result_path = folder / "background-response.json"
    deadline = time.monotonic() + settings.get("timeout_seconds", 900)

    def request(method, url, data=None):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise BackgroundPending("Background response is still pending")
        req = urllib.request.Request(
            url,
            json.dumps(data).encode() if data is not None else None,
            {"Authorization": "Bearer " + key, "Content-Type": "application/json"},
            method=method,
        )
        with urllib.request.urlopen(req, timeout=min(45, remaining)) as response:
            return json.loads(response.read())

    if task_path.exists():
        task = _bound_task(folder, receipt)
        if any(task.get(k) != v for k, v in binding.items()):
            raise BackgroundIdentityError("Background body changed")
        if task.get("status") == "expired":
            raise BackgroundExpired("The existing response is no longer retrievable")
        if task.get("status") not in ("queued", "in_progress", "completed"):
            raise BackgroundRejected("The existing response did not complete")
        if task.get("response_sha256"):
            raw_bytes = result_path.read_bytes()
            if hashlib.sha256(raw_bytes).hexdigest() != task["response_sha256"]:
                raise BackgroundIdentityError("Cached background response changed")
            raw = json.loads(raw_bytes)
            _validate_response(raw, task["response_id"])
            if raw["status"] != "completed":
                raise BackgroundIdentityError("Cached background response is not complete")
            return raw
    else:
        # Persist BEFORE POST. A lost create response must never turn into another POST.
        if submission_path.exists():
            raise BackgroundPending("Submission retained without a response ID; no resend")
        _write(submission_path, {**binding, "status": "submitting", "created_at": time.time()})
        try:
            raw = request("POST", ENDPOINT, payload)
        except (OSError, ValueError) as error:
            _write(
                submission_path,
                {
                    **binding,
                    "status": "unconfirmed",
                    "error_type": type(error).__name__,
                    "http_status": error.code
                    if isinstance(error, urllib.error.HTTPError)
                    else None,
                },
            )
            raise BackgroundPending(
                "Submission outcome is unconfirmed; no automatic resend"
            ) from None
        # Retain a valid returned ID even if later model/usage validation fails.
        _validate_identity(raw)
        task = {
            **binding,
            "response_id": raw["id"],
            "status": raw["status"],
            "created_at": time.time(),
        }
        _write(task_path, task)
        _validate_response(raw)
        if raw["status"] == "completed":
            _write(result_path, raw)
            task["response_sha256"] = hashlib.sha256(result_path.read_bytes()).hexdigest()
            _write(task_path, task)
            return raw

    errors = 0
    while time.monotonic() < deadline:
        if task["status"] in ("failed", "cancelled", "incomplete"):
            raise BackgroundRejected("The provider ended the response without completion")
        try:
            raw = request("GET", ENDPOINT + "/" + task["response_id"])
            _validate_response(raw, task["response_id"])
        except urllib.error.HTTPError as error:
            task["last_http_status"] = error.code
            _write(task_path, task)
            if error.code in (404, 410):
                task["status"] = "expired"
                _write(task_path, task)
                raise BackgroundExpired("The existing response is no longer retrievable") from None
            if error.code not in (408, 429, 500, 502, 503, 504):
                raise BackgroundPending("Could not retrieve the existing response") from None
            errors += 1
        except BackgroundIdentityError:
            raise
        except (OSError, ValueError):
            errors += 1
        else:
            errors = 0
            task["status"] = raw["status"]
            task["updated_at"] = time.time()
            if raw["status"] == "completed":
                _write(result_path, raw)
                task["response_sha256"] = hashlib.sha256(result_path.read_bytes()).hexdigest()
            _write(task_path, task)
            if raw["status"] == "completed":
                return raw
        if errors >= MAX_GET_ERRORS:
            raise BackgroundPending("Retrieval interrupted; the response ID is retained")
        time.sleep(min(POLL_INTERVAL, max(0, deadline - time.monotonic())))
    raise BackgroundPending("Background response is still pending; response ID retained")
