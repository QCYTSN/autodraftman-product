"""Local bridge contract tests; provider calls and worker processes are never made."""

import io
import json
import subprocess
import sys
import threading
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from autodraftman_backend.local_reconstruction import app as bridge
from autodraftman_backend.local_reconstruction.locking import exclusive
from autodraftman_backend.local_reconstruction.settings import Settings, exposure
from autodraftman_backend.local_reconstruction.store import JobStore
from autodraftman_backend.local_reconstruction.streaming import completed_response


def png():
    output = io.BytesIO()
    Image.new("RGB", (32, 24), "white").save(output, format="PNG")
    return output.getvalue()


@pytest.fixture
def local(tmp_path, monkeypatch):
    kernel = tmp_path / "kernel"
    kernel.mkdir()
    (kernel / "product-runtime-manifest.json").write_text("{}")
    config = tmp_path / "config.json"
    config.write_text(
        json.dumps(
            {
                "stages": {
                    "G0": {
                        "key_env": "OPENAI_API_KEY",
                        "max_input_tokens": 10,
                        "max_output_tokens": 10,
                        "input_usd_per_million": 5,
                        "output_usd_per_million": 30,
                    }
                }
            }
        )
    )
    credentials = tmp_path / ".env"
    credentials.write_text("OPENAI_API_KEY=offline-test-value\n")
    settings = Settings(kernel, tmp_path / "data", credentials, config)
    gate = threading.Event()
    launches = []

    class Process:
        def __init__(self, *args, **kwargs):
            launches.append(args)

        def wait(self, timeout=None):
            gate.wait(5)
            return 0

        def poll(self):
            return 0 if gate.is_set() else None

        def terminate(self):
            gate.set()

    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json={"ready": True}))
    monkeypatch.setattr(
        bridge.httpx, "AsyncClient", lambda **kwargs: original_client(transport=transport, **kwargs)
    )
    monkeypatch.setattr(bridge.subprocess, "Popen", Process)
    with TestClient(
        bridge.create_app(settings), base_url="http://127.0.0.1", client=("127.0.0.1", 1234)
    ) as client:
        try:
            yield client, JobStore(settings.data), settings, launches
        finally:
            gate.set()


def submit(client, key=None, content=None, **kwargs):
    return client.post(
        "/local-api/jobs",
        headers={"Idempotency-Key": key or str(uuid.uuid4())},
        files={"image": ("source.png", content if content is not None else png(), "image/png")},
        data={"prompt": "Keep labels", "draftId": "local-test"},
        **kwargs,
    )


def test_submit_idempotence_and_single_worker(local):
    client, store, settings, launches = local
    key = str(uuid.uuid4())
    first = submit(client, key)
    assert first.status_code == 202
    job = first.json()
    assert job["status"] == "queued" and job["stage"] is None
    assert submit(client, key).json()["id"] == job["id"]
    assert submit(client, key, content=png() + b"changed").status_code == 409
    assert submit(client).status_code == 409
    assert len(launches) == 1
    assert client.get(f"/local-api/jobs/{job['id']}/result.svg").status_code == 404
    assert client.get("/local-api/jobs").json()[0]["id"] == job["id"]
    assert (settings.data / "jobs" / job["id"] / "source.png").is_file()


def test_invalid_input_never_starts_worker(local):
    client, _, _, launches = local
    assert submit(client, content=b"<svg><script>bad</script></svg>").status_code == 400
    assert submit(client, key="invalid").status_code == 400
    assert submit(client, content=b"x" * (10 * 1024 * 1024 + 1)).status_code == 413
    assert launches == []


def test_local_security_boundary(local):
    client, _, _, launches = local
    assert (
        client.get("/local-api/health", headers={"Origin": "https://outside.example"}).status_code
        == 403
    )
    assert client.get("/local-api/health", headers={"Host": "outside.example"}).status_code == 400
    response = client.post("/local-api/jobs", content="x", headers={"Sec-Fetch-Site": "cross-site"})
    assert response.status_code == 403
    assert launches == []


def test_only_finished_allowed_artifacts_are_served(local):
    client, store, settings, _ = local
    job = store.create(str(uuid.uuid4()), "hash", "../source.png", "draft")
    folder = settings.data / "jobs" / job["id"] / "run"
    folder.mkdir(parents=True)
    (folder / "final.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
    store.update(job["id"], status="succeeded", stage="finalize")
    url = f"/local-api/jobs/{job['id']}/result.svg"
    response = client.get(url)
    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "sandbox" in response.headers["Content-Security-Policy"]
    assert "attachment" in response.headers["Content-Disposition"]
    assert client.get(f"/local-api/jobs/{job['id']}/input.json").status_code == 404


def test_budget_reservations_block_new_paid_jobs_but_keep_history(local):
    client, _, settings, launches = local
    receipt = settings.data / "jobs/prior/run/G0/receipt.json"
    receipt.parent.mkdir(parents=True)
    receipt.write_text(json.dumps({"known_usd": 1, "reserved_usd": 4}))
    assert exposure(settings.data) == 5
    state = client.get("/local-api/health").json()
    assert state["service"] == "figfox-local-v1" and state["available"] is False
    assert "budget_exceeded" in state["problems"]
    assert submit(client).status_code == 503
    assert client.get("/local-api/jobs").status_code == 200
    assert launches == []
    receipt.write_text("{partial")
    assert exposure(settings.data) == float("inf")


def test_recovery_keeps_failed_task_and_revision(tmp_path):
    store = JobStore(tmp_path)
    job = store.create(str(uuid.uuid4()), "hash", "source.png", "draft")
    store.update(job["id"], status="running", stage="inspect")
    store.recover()
    recovered = store.get(job["id"])
    assert recovered["status"] == "failed" and recovered["error"] == "interrupted"
    assert recovered["stage"] == "inspect" and recovered["revision"] == 3


def test_two_processes_cannot_hold_budget_lock(tmp_path):
    lock = tmp_path / "worker.lock"
    command = [
        sys.executable,
        "-c",
        "import sys; from pathlib import Path; "
        "from autodraftman_backend.local_reconstruction.locking import exclusive;\n"
        "with exclusive(Path(sys.argv[1])): pass",
        str(lock),
    ]
    with exclusive(lock):
        assert subprocess.run(command, capture_output=True).returncode != 0
    assert subprocess.run(command, capture_output=True).returncode == 0


def test_stream_requires_completion_and_keeps_usage():
    result = {"status": "completed", "output": [], "usage": {"input_tokens": 22}}
    lines = [
        "event: response.created",
        'data: {"type":"response.created"}',
        "",
        "data: " + json.dumps({"type": "response.completed", "response": result}),
        "",
    ]
    assert completed_response(iter(lines)) == result
    with pytest.raises(ValueError, match="without completion"):
        completed_response(iter(['data: {"type":"response.output_text.delta","delta":"<svg"}', ""]))
    with pytest.raises(ValueError, match="failed or incomplete"):
        completed_response(iter(['data: {"type":"response.incomplete"}', ""]))
