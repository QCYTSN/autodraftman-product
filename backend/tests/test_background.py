"""Fault injection only; no provider calls, credentials, real images or job state."""

import copy
import io
import json
import socket
import threading
from http.client import RemoteDisconnected
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError

import pytest

from autodraftman_backend.local_reconstruction import background as bg


@pytest.fixture
def scenario(tmp_path, monkeypatch):
    monkeypatch.setenv("BACKGROUND_TEST_KEY", "offline-only")
    monkeypatch.setattr(bg.time, "sleep", lambda _: None)
    receipt = {
        "request_id": "stage-request",
        "input_sha256": "a" * 64,
        "status": "uncertain",
        "reserved_usd": 1.6384,
    }
    (tmp_path / "receipt.json").write_text(json.dumps(receipt))
    settings = {
        "model": "gpt-5.5",
        "protocol": "responses",
        "endpoint": bg.ENDPOINT,
        "key_env": "BACKGROUND_TEST_KEY",
        "timeout_seconds": 900,
    }
    body = {
        "model": "gpt-5.5",
        "store": False,
        "input": [{"content": "fixture"}],
        "reasoning": {"effort": "medium"},
        "max_output_tokens": 32768,
    }
    calls = []
    replies = []

    def network(request, **kwargs):
        calls.append(
            (
                request.get_method(),
                request.full_url,
                json.loads(request.data) if request.data else None,
                kwargs["timeout"],
            )
        )
        assert request.headers["Authorization"] == "Bearer offline-only"
        assert replies, "Unexpected network operation"
        response = replies.pop(0)
        if isinstance(response, Exception):
            raise response
        return io.BytesIO(json.dumps(response).encode())

    monkeypatch.setattr(bg.urllib.request, "urlopen", network)
    return tmp_path, settings, body, calls, replies


def response(status="completed", **extra):
    value = {"id": "resp_fixture", "model": "gpt-5.5", "status": status}
    if status == "completed":
        value.update(
            output=[{"content": [{"type": "output_text", "text": "fixture"}]}],
            usage={"input_tokens": 100, "output_tokens": 10},
        )
    return {**value, **extra}


def test_create_poll_cache_and_body_preservation(scenario):
    folder, settings, body, calls, replies = scenario
    before = copy.deepcopy(body)
    replies.extend([response("queued"), response("in_progress"), response()])
    assert bg.background_response(body, settings, folder) == response()
    assert body == before
    assert [call[0] for call in calls] == ["POST", "GET", "GET"]
    assert calls[0][2] == {**body, "background": True}
    assert all(call[1] == bg.ENDPOINT + "/resp_fixture" for call in calls[1:])
    assert all(0 < call[3] <= 45 for call in calls)
    assert bg.background_response(body, settings, folder) == response()
    assert len(calls) == 3
    assert "offline-only" not in "".join(path.read_text() for path in folder.glob("*.json"))


def test_retrieve_after_disconnection_never_posts_again(scenario):
    folder, settings, body, calls, replies = scenario
    replies.extend([response("in_progress"), *[RemoteDisconnected("offline")] * 3])
    with pytest.raises(bg.BackgroundPending):
        bg.background_response(body, settings, folder)
    assert bg.resumable_task(folder)
    receipt_before = (folder / "receipt.json").read_bytes()
    replies.append(response())
    assert bg.background_response(body, settings, folder) == response()
    assert [call[0] for call in calls].count("POST") == 1
    assert (folder / "receipt.json").read_bytes() == receipt_before


def test_unknown_create_is_never_resent(scenario):
    folder, settings, body, calls, replies = scenario
    replies.append(RemoteDisconnected("offline"))
    for _ in range(2):
        with pytest.raises(bg.BackgroundPending):
            bg.background_response(body, settings, folder)
    assert len(calls) == 1
    assert not bg.resumable_task(folder)
    assert json.loads((folder / "receipt.json").read_text())["reserved_usd"] == 1.6384


@pytest.mark.parametrize("code", [404, 410])
def test_expiration_requires_provider_evidence(scenario, code):
    folder, settings, body, calls, replies = scenario
    replies.extend([response("queued"), HTTPError(bg.ENDPOINT, code, "fixture", {}, None)])
    with pytest.raises(bg.BackgroundExpired):
        bg.background_response(body, settings, folder)
    assert not bg.resumable_task(folder)
    with pytest.raises(bg.BackgroundExpired):
        bg.background_response(body, settings, folder)
    assert len(calls) == 2


@pytest.mark.parametrize("status", ["failed", "cancelled", "incomplete"])
def test_terminal_provider_status_is_retained(scenario, status):
    folder, settings, body, calls, replies = scenario
    replies.extend([response("queued"), response(status)])
    with pytest.raises(bg.BackgroundRejected):
        bg.background_response(body, settings, folder)
    assert not bg.resumable_task(folder)
    with pytest.raises(bg.BackgroundRejected):
        bg.background_response(body, settings, folder)
    assert len(calls) == 2


@pytest.mark.parametrize(
    "usage",
    [
        [],
        {},
        {"input_tokens": -1, "output_tokens": 10},
        {"input_tokens": True, "output_tokens": 10},
        {"input_tokens": 10, "output_tokens": 10, "input_tokens_details": "bad"},
        {"input_tokens": 10, "output_tokens": 10, "input_tokens_details": {"cached_tokens": 11}},
    ],
)
def test_invalid_usage_retains_returned_id(scenario, usage):
    folder, settings, body, _, replies = scenario
    replies.append(response(usage=usage))
    with pytest.raises(bg.BackgroundIdentityError):
        bg.background_response(body, settings, folder)
    assert json.loads((folder / "provider-task.json").read_text())["response_id"] == "resp_fixture"


@pytest.mark.parametrize("change", ["body", "receipt", "cache", "remote_id", "model"])
def test_identity_corruption_fails_closed(scenario, change):
    folder, settings, body, calls, replies = scenario
    replies.append(response())
    bg.background_response(body, settings, folder)
    if change == "body":
        body["input"] = []
    elif change == "receipt":
        receipt = json.loads((folder / "receipt.json").read_text())
        receipt["input_sha256"] = "b" * 64
        (folder / "receipt.json").write_text(json.dumps(receipt))
    elif change == "cache":
        (folder / "background-response.json").write_text("{}")
    else:
        task = json.loads((folder / "provider-task.json").read_text())
        task.pop("response_sha256")
        (folder / "provider-task.json").write_text(json.dumps(task))
        replies.append(
            response(**({"id": "resp_different"} if change == "remote_id" else {"model": 123}))
        )
    with pytest.raises(bg.BackgroundIdentityError):
        bg.background_response(body, settings, folder)
    assert sum(call[0] == "POST" for call in calls) == 1


@pytest.mark.parametrize("key", ["request_id", "input_sha256"])
def test_missing_binding_fields_cannot_resume(scenario, key):
    folder, settings, body, _, replies = scenario
    replies.append(response())
    bg.background_response(body, settings, folder)
    for name in ("receipt.json", "provider-task.json"):
        value = json.loads((folder / name).read_text())
        value.pop(key)
        (folder / name).write_text(json.dumps(value))
    assert not bg.resumable_task(folder)


def test_old_timestamp_does_not_discard_retrievable_response(scenario):
    folder, settings, body, calls, replies = scenario
    replies.extend([response("queued"), *[TimeoutError()] * 3])
    with pytest.raises(bg.BackgroundPending):
        bg.background_response(body, settings, folder)
    task = json.loads((folder / "provider-task.json").read_text())
    task["created_at"] = 1
    (folder / "provider-task.json").write_text(json.dumps(task))
    assert bg.resumable_task(folder)
    replies.append(response())
    assert bg.background_response(body, settings, folder) == response()
    assert sum(call[0] == "POST" for call in calls) == 1


def test_poll_deadline_keeps_identity(scenario, monkeypatch):
    folder, settings, body, calls, replies = scenario
    clock = [0]
    monkeypatch.setattr(bg.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(bg.time, "sleep", lambda seconds: clock.__setitem__(0, clock[0] + seconds))
    settings["timeout_seconds"] = 4
    replies.extend([response("queued"), response("in_progress"), response("in_progress")])
    with pytest.raises(bg.BackgroundPending):
        bg.background_response(body, settings, folder)
    assert bg.resumable_task(folder) and len(calls) == 3


def test_auth_failure_only_stops_retrieval(scenario):
    folder, settings, body, calls, replies = scenario
    replies.extend([response("queued"), HTTPError(bg.ENDPOINT, 401, "fixture", {}, None)])
    with pytest.raises(bg.BackgroundPending):
        bg.background_response(body, settings, folder)
    assert bg.resumable_task(folder)
    replies.append(response())
    assert bg.background_response(body, settings, folder) == response()
    assert sum(call[0] == "POST" for call in calls) == 1


def test_real_loopback_http_disconnect_and_retrieval(tmp_path, monkeypatch):
    """Exercise urllib sockets against a synthetic local provider, never the internet."""
    calls = []
    disconnect = [True]

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_POST(self):
            assert self.path == "/v1/responses"
            payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            calls.append(("POST", payload))
            self.reply(response("queued"))

        def do_GET(self):
            assert self.path == "/v1/responses/resp_fixture"
            calls.append(("GET", None))
            if disconnect[0]:
                self.connection.shutdown(socket.SHUT_RDWR)
                self.connection.close()
            else:
                self.reply(response())

        def reply(self, value):
            data = json.dumps(value).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    endpoint = f"http://127.0.0.1:{server.server_port}/v1/responses"
    monkeypatch.setattr(bg, "ENDPOINT", endpoint)
    monkeypatch.setattr(bg.time, "sleep", lambda _: None)
    monkeypatch.setenv("BACKGROUND_TEST_KEY", "synthetic-loopback-only")
    # Disable machine proxies for this isolated loopback test.
    monkeypatch.setattr(
        bg.urllib.request,
        "urlopen",
        bg.urllib.request.build_opener(
            bg.urllib.request.ProxyHandler({}),
        ).open,
    )
    (tmp_path / "receipt.json").write_text(
        json.dumps(
            {
                "request_id": "fixture",
                "input_sha256": "a" * 64,
                "status": "uncertain",
                "reserved_usd": 1.6384,
            }
        )
    )
    body = {"model": "gpt-5.5", "store": False, "input": []}
    settings = {
        "endpoint": endpoint,
        "protocol": "responses",
        "model": "gpt-5.5",
        "key_env": "BACKGROUND_TEST_KEY",
        "timeout_seconds": 10,
    }
    try:
        with pytest.raises(bg.BackgroundPending):
            bg.background_response(body, settings, tmp_path)
        assert bg.resumable_task(tmp_path)
        disconnect[0] = False
        assert bg.background_response(body, settings, tmp_path) == response()
        assert [method for method, _ in calls] == ["POST", "GET", "GET", "GET", "GET"]
        assert calls[0][1] == {**body, "background": True}
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
