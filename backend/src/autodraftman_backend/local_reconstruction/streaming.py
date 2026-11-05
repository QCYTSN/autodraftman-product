"""Responses SSE transport. Kernel request identities, reserves and validation stay intact."""

import json
import os
import time

import httpx

from .background import RequestNotSubmitted, background_response, release_unsent_reserve


def completed_response(lines):
    """Accept only the final provider response, including its usage; never partial text."""
    data = []
    for line in lines:
        if line.startswith("data:"):
            data.append(line[5:].lstrip())
        elif not line and data:
            event = json.loads("\n".join(data))
            data.clear()
            if event.get("type") == "response.completed":
                response = event["response"]
                if response.get("status") != "completed":
                    raise ValueError("Provider response incomplete")
                return response
            if event.get("type") in ("error", "response.failed", "response.incomplete"):
                raise ValueError("Provider stream failed or incomplete")
    raise ValueError("Provider stream ended without completion")


def install(transport, *, background=False):
    original = transport.request

    def request(folder, prompt, images, settings, *, http=None):
        if http is not None or settings.get("protocol", "responses") != "responses":
            return original(folder, prompt, images, settings, http=http)

        if background:
            settings = {**settings, "local_request_mode": "responses-background-v1"}
            try:
                return original(
                    folder,
                    prompt,
                    images,
                    settings,
                    http=lambda body: background_response(body, settings, folder),
                )
            except RequestNotSubmitted:
                release_unsent_reserve(folder)
                raise

        def stream(body):
            timeout = settings.get("timeout_seconds", 900)
            started = time.monotonic()
            # Preserve the configured/system proxy. No read-side failure resubmits a POST.
            with httpx.Client(timeout=timeout) as client:
                with client.stream(
                    "POST",
                    settings["endpoint"],
                    json={**body, "stream": True},
                    headers={"Authorization": "Bearer " + os.environ[settings["key_env"]]},
                ) as response:
                    response.raise_for_status()

                    def lines():
                        for line in response.iter_lines():
                            if time.monotonic() - started > timeout:
                                raise TimeoutError("Provider stream exceeded deadline")
                            yield line

                    return completed_response(lines())

        return original(folder, prompt, images, settings, http=stream)

    transport.request = request
