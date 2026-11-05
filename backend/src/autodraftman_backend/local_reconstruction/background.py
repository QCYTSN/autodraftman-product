"""Submit once, then retrieve the same background response across read-side disconnects."""

import hashlib
import json
import os
import re
import time
from pathlib import Path

import httpx


class RequestNotSubmitted(ConnectionError):
    """Connection establishment failed before any model HTTP request was sent."""


def release_unsent_reserve(folder):
    path = Path(folder) / "receipt.json"
    raw = path.read_bytes()
    receipt = json.loads(raw)
    if receipt.get("status") == "not_submitted":
        return
    if receipt.get("status") != "uncertain" or receipt.get("error_type") not in (
        "RequestNotSubmitted",
        "ConnectError",
        "ConnectTimeout",
    ):
        raise ValueError("Only a proven connection failure can release a reserve")
    path.with_name("unsent-reserve-original.json").write_bytes(raw)
    receipt.update(
        status="not_submitted",
        known_usd=0,
        reserved_usd=0,
        accounting_reason="Connection establishment failed before HTTP request submission",
    )
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    temporary.replace(path)


def background_response(
    body, settings, folder, *, client=None, sleep=time.sleep, clock=time.monotonic
):
    folder = Path(folder)
    task_file = folder / "provider-task.json"
    timeout = settings.get("timeout_seconds", 900)
    deadline = clock() + timeout
    request_body = {**body, "stream": False, "background": True, "store": False}
    fingerprint = hashlib.sha256(json.dumps(request_body, sort_keys=True).encode()).hexdigest()
    headers = {"Authorization": "Bearer " + os.environ[settings["key_env"]]}

    def execute(connection):
        # Retry only connection establishment. Read/write failures may already be charged.
        for attempt in range(3):
            try:
                response = connection.post(settings["endpoint"], json=request_body, headers=headers)
                break
            except (httpx.ConnectError, httpx.ConnectTimeout) as error:
                if attempt == 2:
                    raise RequestNotSubmitted("Connection failed before submission") from error
                sleep(0.5 * (attempt + 1))
        response.raise_for_status()
        value = response.json()
        response_id = value.get("id", "")
        if not re.fullmatch(r"resp_[A-Za-z0-9_-]+", response_id):
            raise ValueError("Invalid background response ID")
        task = {
            "response_id": response_id,
            "request_sha256": fingerprint,
            "status": value.get("status"),
        }
        temporary = task_file.with_suffix(".tmp")
        temporary.write_text(json.dumps(task, indent=2), encoding="utf-8")
        temporary.replace(task_file)
        while value.get("status") in ("queued", "in_progress"):
            if clock() >= deadline:
                raise TimeoutError("Background response exceeded deadline")
            sleep(min(2, max(0, deadline - clock())))
            try:
                poll = connection.get(settings["endpoint"] + "/" + response_id, headers=headers)
                if poll.status_code in (408, 429) or poll.status_code >= 500:
                    continue
                poll.raise_for_status()
                value = poll.json()
            except httpx.TransportError:
                continue
            if value.get("id") != response_id:
                raise ValueError("Mismatched background response ID")
        task["status"] = value.get("status")
        task_file.write_text(json.dumps(task, indent=2), encoding="utf-8")
        if value.get("status") != "completed":
            raise ValueError("Background response failed or incomplete")
        return value

    if client is not None:
        return execute(client)
    with httpx.Client(timeout=httpx.Timeout(min(45, timeout), connect=15)) as connection:
        return execute(connection)
