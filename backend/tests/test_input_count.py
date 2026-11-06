import copy
import io
import json
import urllib.error

import pytest

from autodraftman_backend.local_reconstruction.failures import failure_details
from autodraftman_backend.local_reconstruction.input_count import (
    InputCountUnavailable,
    count_input_tokens,
)


def settings():
    return {
        "protocol": "responses",
        "endpoint": "https://api.openai.com/v1/responses",
        "model": "gpt-5.5",
        "key_env": "OPENAI_API_KEY",
        "max_input_tokens": 131072,
    }


def test_counter_preserves_every_attachment_and_uses_only_count_endpoint(tmp_path, monkeypatch):
    content = [{"type": "input_text", "text": "原版 prompt"}] + [
        {"type": "input_image", "image_url": f"data:image/png;base64,fixture{i}",
         "detail": "original"}
        for i in range(20)
    ]
    before = copy.deepcopy(content)
    requests = []

    def send(request, **kwargs):
        requests.append(request)
        assert kwargs["timeout"] == 60
        return io.BytesIO(b'{"object":"response.input_tokens","input_tokens":1200}')

    monkeypatch.setenv("OPENAI_API_KEY", "offline-fixture")
    monkeypatch.setattr("urllib.request.urlopen", send)
    assert count_input_tokens(content, settings(), tmp_path) == 1200
    assert len(requests) == 1
    assert requests[0].full_url == "https://api.openai.com/v1/responses/input_tokens"
    assert json.loads(requests[0].data) == {
        "model": "gpt-5.5",
        "input": [{"role": "user", "content": before}],
        "reasoning": {"effort": "medium"},
    }
    assert content == before
    record = json.loads((tmp_path / "input-count.json").read_text())
    assert record["input_tokens"] == 1200 and record["status"] == "counted"
    assert "offline-fixture" not in (tmp_path / "input-count.json").read_text()
    assert not (tmp_path / "receipt.json").exists()


@pytest.mark.parametrize("response", [
    {}, [], {"object": "response.input_tokens", "input_tokens": True},
    {"object": "response.input_tokens", "input_tokens": -1},
    {"object": "response.input_tokens", "input_tokens": 0},
    {"object": "response.input_tokens", "input_tokens": 10.5},
    {"object": "response", "input_tokens": 1200},
])
def test_invalid_counts_stop_without_inference(tmp_path, monkeypatch, response):
    monkeypatch.setenv("OPENAI_API_KEY", "offline-fixture")
    requests = []

    def send(request, **kwargs):
        requests.append(request.full_url)
        return io.BytesIO(json.dumps(response).encode())

    monkeypatch.setattr("urllib.request.urlopen", send)
    with pytest.raises(InputCountUnavailable):
        count_input_tokens([], settings(), tmp_path)
    assert requests == ["https://api.openai.com/v1/responses/input_tokens"]
    assert not (tmp_path / "receipt.json").exists()


@pytest.mark.parametrize("error", [TimeoutError("offline"), urllib.error.HTTPError(
    "https://api.openai.com/v1/responses/input_tokens", 503, "offline", {}, None,
)])
def test_count_failures_do_not_retry_or_reserve_generation_cost(tmp_path, monkeypatch, error):
    monkeypatch.setenv("OPENAI_API_KEY", "offline-fixture")
    requests = []

    def send(request, **kwargs):
        requests.append(request.full_url)
        raise error

    monkeypatch.setattr("urllib.request.urlopen", send)
    with pytest.raises(InputCountUnavailable) as raised:
        count_input_tokens([], settings(), tmp_path)
    assert len(requests) == 1
    details = failure_details(tmp_path, raised.value, "reconstruct")
    assert details["error"] == "input_count_unavailable"
    assert details["failure"]["billing"] == "not_started"
    assert details["failure"]["costUsd"] == 0
    assert details["failure"]["reservedUsd"] == 0


def test_counter_rejects_other_providers_without_network(tmp_path, monkeypatch):
    def forbidden(*args, **kwargs):
        pytest.fail("Unexpected network call")

    monkeypatch.setattr("urllib.request.urlopen", forbidden)
    config = {**settings(), "model": "other-model"}
    with pytest.raises(InputCountUnavailable):
        count_input_tokens([], config, tmp_path)
