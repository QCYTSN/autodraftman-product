"""Count the unchanged multimodal input before a user-submitted generation request.

https://developers.openai.com/api/docs/guides/token-counting
This endpoint counts input only; it does not generate a model response.
"""

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path


class InputCountUnavailable(ValueError):
    pass


def count_input_tokens(content, settings, folder):
    if (
        settings.get("protocol") != "responses"
        or settings.get("endpoint") != "https://api.openai.com/v1/responses"
        or settings.get("model") != "gpt-5.5"
    ):
        raise InputCountUnavailable("Unsupported input-counting provider")
    payload = {
        "model": settings["model"],
        "input": [{"role": "user", "content": content}],
        "reasoning": {"effort": "medium"},
    }
    encoded = json.dumps(payload).encode()
    record = {
        "endpoint": settings["endpoint"] + "/input_tokens",
        "request_sha256": hashlib.sha256(encoded).hexdigest(),
        "model": settings["model"],
        "configured_limit": settings["max_input_tokens"],
        "status": "unavailable",
        "generation_submitted_by_counter": False,
    }
    try:
        key = os.environ.get(settings["key_env"])
        if not key:
            raise InputCountUnavailable("Missing input-counting credential")
        request = urllib.request.Request(
            record["endpoint"],
            encoded,
            {"Authorization": "Bearer " + key, "Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            result = json.loads(response.read())
        count = result.get("input_tokens") if isinstance(result, dict) else None
        if (
            not isinstance(result, dict)
            or result.get("object") != "response.input_tokens"
            or type(count) is not int
            or count <= 0
        ):
            raise InputCountUnavailable("Invalid input-counting response")
        record.update(status="counted", input_tokens=count)
        return count
    except (OSError, ValueError) as error:
        record["error_type"] = type(error).__name__
        if isinstance(error, urllib.error.HTTPError):
            record["http_status"] = error.code
        raise InputCountUnavailable("Input token count could not be confirmed") from None
    finally:
        Path(folder, "input-count.json").write_text(
            json.dumps(record, indent=2), encoding="utf-8"
        )
