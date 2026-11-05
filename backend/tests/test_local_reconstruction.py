"""Local bridge contract tests; provider calls and worker processes are never made."""

import hashlib
import io
import json
import subprocess
import sys
import threading
import uuid
from dataclasses import replace

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageChops

from autodraftman_backend.local_reconstruction import app as bridge
from autodraftman_backend.local_reconstruction.background import (
    RequestNotSubmitted,
    background_response,
    release_unsent_reserve,
)
from autodraftman_backend.local_reconstruction.failures import can_retry, failure_details
from autodraftman_backend.local_reconstruction.inputs import (
    InputTooLarge,
    input_bound,
    pack_sam_inputs,
    prepare_inputs,
)
from autodraftman_backend.local_reconstruction.locking import exclusive
from autodraftman_backend.local_reconstruction.recovery import recovery_mode
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


def test_manual_test_limit_accepts_one_job_and_keeps_idempotence(local):
    _, _, settings, launches = local
    limited = replace(settings, max_jobs=1)
    with TestClient(
        bridge.create_app(limited), base_url="http://127.0.0.1", client=("127.0.0.1", 1234)
    ) as client:
        key = str(uuid.uuid4())
        first = submit(client, key)
        assert first.status_code == 202
        assert submit(client, key).json()["id"] == first.json()["id"]
        state = client.get("/local-api/health").json()
        assert state["available"] is False
        assert state["remainingTestJobs"] == 0
        assert "test_limit_reached" in state["problems"]
        assert submit(client).status_code in (409, 503)
        assert len(launches) == 1


def test_explicit_limits_preserve_existing_cost_records(tmp_path, monkeypatch):
    monkeypatch.setenv("FIGFOX_LOCAL_DATA", str(tmp_path))
    assert Settings.from_env().total_budget == 5
    receipt = tmp_path / "jobs/prior/run/G0/receipt.json"
    receipt.parent.mkdir(parents=True)
    receipt.write_text(json.dumps({"reserved_usd": 2.3, "known_usd": 0.7}))
    limits = tmp_path / "test-limits.json"
    limits.write_text(json.dumps({"cumulative_budget_usd": 8, "max_jobs": 2}))
    settings = Settings.from_env()
    assert settings.total_budget - exposure(tmp_path) == 5
    assert settings.max_jobs == 2
    assert receipt.is_file()
    limits.write_text(json.dumps({"cumulative_budget_usd": -1, "max_jobs": 2}))
    with pytest.raises(ValueError, match="Invalid local test budget"):
        Settings.from_env()


def test_many_crops_are_packed_without_dropping_assets_or_changing_source(tmp_path):
    source = tmp_path / "source.png"
    source.write_bytes(png())
    assets = []
    for index in range(32):
        crop = tmp_path / f"crop-{index}.png"
        crop.write_bytes(png())
        assets.append({"id": f"P{index}", "path": str(crop)})
    (tmp_path / "sam.json").write_text(json.dumps({"assets": assets}))
    images = [source] + [a["path"] for a in assets]
    prompt = "Canvas: 32 x 24\nActual attachment manifest (in order): old individual crops"
    packed_prompt, packed = pack_sam_inputs(prompt, {}, images, tmp_path / "call", 131072)
    assert packed[0] == source and source.read_bytes() == png()
    assert len(packed) == 3
    assert input_bound(packed_prompt + "\n{}", packed) < 131072
    assert "old individual crops" not in packed_prompt
    manifest = json.loads((tmp_path / "model-attachments/manifest.json").read_text())
    assert [a["id"] for a in manifest["assets"]] == [a["id"] for a in assets]
    assert pack_sam_inputs("small", {}, [source], tmp_path / "call", 131072) == ("small", [source])


def test_failure_billing_and_retry_never_hide_paid_or_uncertain_calls(tmp_path):
    error = ValueError("complete request exceeds configured input bound before HTTP")
    details = failure_details(tmp_path, error)
    job = {"status": "failed", **details}
    assert details["error"] == "input_too_large"
    assert details["failure"]["billing"] == "not_started"
    assert can_retry(job, tmp_path)
    receipt = tmp_path / "receipt.json"
    receipt.write_text(json.dumps({"reserved_usd": 2.29}))
    assert not can_retry(job, tmp_path)
    details = failure_details(tmp_path, ConnectionError("Disconnected"))
    assert details["error"] == "provider_unconfirmed"
    assert details["failure"]["reservedUsd"] == 2.29
    assert details["failure"]["retryable"] is False
    receipt.write_text("broken")
    assert failure_details(tmp_path, error)["failure"]["billing"] == "unknown"


def test_retry_reuses_job_and_archives_preflight_without_consuming_test_slot(local):
    client, store, settings, launches = local
    job = store.create(str(uuid.uuid4()), "hash", "source.png", "draft")
    folder = settings.data / "jobs" / job["id"]
    (folder / "run").mkdir(parents=True)
    (folder / "run/identity.json").write_text('{"prior":true}')
    error = ValueError("complete request exceeds configured input bound before HTTP")
    failed = store.update(job["id"], status="failed", **failure_details(folder, error))
    limited = replace(settings, max_jobs=1)
    with TestClient(
        bridge.create_app(limited), base_url="http://127.0.0.1", client=("127.0.0.1", 1234)
    ) as retry_client:
        url = f"/local-api/jobs/{job['id']}/retry"
        response = retry_client.post(url, json={"revision": failed["revision"]})
        assert response.status_code == 202
        assert response.json()["id"] == job["id"]
        assert retry_client.post(url, json={"revision": failed["revision"]}).status_code == 202
        assert len(launches) == 1 and store.count() == 1
        archived = folder / "preflight-attempts" / str(failed["revision"]) / "run/identity.json"
        assert json.loads(archived.read_text()) == {"prior": True}


def test_retry_refuses_uncertain_receipts_even_with_stale_retry_flag(local):
    client, store, settings, launches = local
    job = store.create(str(uuid.uuid4()), "hash", "source.png", "draft")
    folder = settings.data / "jobs" / job["id"] / "run"
    folder.mkdir(parents=True)
    (folder / "receipt.json").write_text(json.dumps({"reserved_usd": 2.29}))
    job = store.update(job["id"], status="failed", failure={"retryable": True})
    assert (
        client.post(
            f"/local-api/jobs/{job['id']}/retry", json={"revision": job["revision"]}
        ).status_code
        == 409
    )
    assert launches == []


@pytest.mark.parametrize(
    "stage,count,text_size",
    [("G0", 24, 8000), ("G1", 8, 12000), ("G1", 8, 26000), ("G2", 10, 34000), ("G2", 12, 20000)],
)
def test_all_stage_inputs_preserve_every_evidence_pixel(tmp_path, stage, count, text_size):
    sizes = [(609, 277)] * 2 + [(1232, 302)] * 4 + [(452, 180)] * (count - 6)
    images = []
    for index, size in enumerate(sizes):
        path = tmp_path / f"input-{index}.png"
        Image.new("RGB", size, (index * 7, 35, 128)).save(path)
        images.append(path)
    prompt = "p" * text_size
    original = [p.read_bytes() for p in images]
    packed_prompt, packed = prepare_inputs(stage, prompt, {}, images, tmp_path / "call", 131072)
    assert input_bound(packed_prompt + "\n{}", packed) <= 131072
    assert [p.read_bytes() for p in images] == original
    if input_bound(prompt + "\n{}", images) <= 131072:
        assert packed == images and packed_prompt == prompt
        return
    manifest = json.loads((tmp_path / "model-atlas/manifest.json").read_text())
    assert manifest["resampled"] is False
    assert len(manifest["panels"]) == len(images) - (1 if stage == "G0" else 2)
    for entry in manifest["panels"]:
        with (
            Image.open(packed[entry["attachment"] - 1]) as atlas,
            Image.open(images[entry["input_index"] - 1]) as source,
        ):
            assert ImageChops.difference(atlas.crop(entry["atlas_box"]), source).getbbox() is None


def test_unrepresentable_input_fails_before_transport(tmp_path):
    image = tmp_path / "image.png"
    image.write_bytes(png())
    with pytest.raises(InputTooLarge, match="before HTTP"):
        prepare_inputs("G2", "x" * 131073, {}, [image, image], tmp_path / "call", 131072)
    assert not list(tmp_path.glob("**/receipt.json"))


def completed_checkpoints(folder):
    run = folder / "run"
    source = png()
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"/>'
    config = {"budget_usd": 5}
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "source.png").write_bytes(source)
    (folder / "effective-config.json").write_text(json.dumps(config))
    for stage in ("G0", "G1"):
        call = run / stage / "call"
        call.mkdir(parents=True)
        raw = json.dumps({"text": "{}"}).encode()
        (call / "response.json").write_bytes(raw)
        (call / "receipt.json").write_text(
            json.dumps(
                {
                    "status": "completed",
                    "known_usd": 0.25,
                    "reserved_usd": 0,
                    "response_sha256": hashlib.sha256(raw).hexdigest(),
                }
            )
        )
    (run / "G0/initial.svg").write_bytes(svg)
    (run / "G1/model.json").write_text("{}")
    digest = hashlib.sha256(source).hexdigest()
    (run / "identity.json").write_text(json.dumps({"config": config, "source_sha256": digest}))
    (run / "G0/manifest.json").write_text(
        json.dumps({"source_sha256": digest, "initial_sha256": hashlib.sha256(svg).hexdigest()})
    )


def test_resume_requires_verified_paid_checkpoints_and_unsent_stage(tmp_path):
    completed_checkpoints(tmp_path)
    job = {"status": "failed", "stage": "repair", "error": "input_too_large"}
    assert recovery_mode(job, tmp_path) == "resume"
    details = failure_details(tmp_path, ValueError("input bound before HTTP"), "repair")
    assert details["failure"]["resume"] is True
    assert details["failure"]["costUsd"] == 0.5
    (tmp_path / "run/G1/model.json").write_text('{"changed":true}')
    assert recovery_mode(job, tmp_path) is None
    (tmp_path / "run/G1/model.json").write_text("{}")
    receipt = tmp_path / "run/G2/call/receipt.json"
    receipt.parent.mkdir(parents=True)
    receipt.write_text('{"status":"uncertain","reserved_usd":1.63}')
    assert recovery_mode(job, tmp_path) is None


def test_resume_endpoint_keeps_completed_stages_and_frozen_budget(local):
    client, store, settings, launches = local
    job = store.create(str(uuid.uuid4()), "hash", "source.png", "draft")
    folder = settings.data / "jobs" / job["id"]
    completed_checkpoints(folder)
    config = json.loads(settings.config.read_text())
    config["stages"]["G2"] = dict(config["stages"]["G0"])
    settings.config.write_text(json.dumps(config))
    failed = store.update(
        job["id"],
        status="failed",
        stage="repair",
        **failure_details(folder, ValueError("input bound before HTTP"), "repair"),
    )
    before = {p: p.read_bytes() for p in folder.glob("**/*.json")}
    url = f"/local-api/jobs/{job['id']}/retry"
    response = client.post(url, json={"revision": failed["revision"]})
    assert response.status_code == 202
    assert response.json()["resumeStage"] == "repair"
    assert len(launches) == 1
    assert all(p.read_bytes() == data for p, data in before.items())
    assert exposure(settings.data) == 0.5
    assert client.post(url, json={"revision": failed["revision"]}).status_code == 202
    assert len(launches) == 1


def test_background_transport_reconnects_by_get_without_resubmitting(tmp_path, monkeypatch):
    monkeypatch.setenv("TEST_PROVIDER_KEY", "offline-value")
    methods, bodies = [], []
    result = {
        "id": "resp_test",
        "status": "completed",
        "usage": {"input_tokens": 5, "output_tokens": 8},
        "output": [],
    }

    def handle(request):
        methods.append(request.method)
        if request.method == "POST":
            bodies.append(json.loads(request.content))
            return httpx.Response(200, json={"id": "resp_test", "status": "queued"})
        assert request.url.path.endswith("/resp_test")
        if len(methods) == 2:
            raise httpx.RemoteProtocolError("Read disconnected")
        if len(methods) == 3:
            return httpx.Response(503)
        return httpx.Response(200, json=result)

    settings = {"key_env": "TEST_PROVIDER_KEY", "endpoint": "https://example.test/v1/responses"}
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        actual = background_response(
            {"model": "gpt-5.5", "input": "test"},
            settings,
            tmp_path,
            client=client,
            sleep=lambda _: None,
        )
    assert actual == result
    assert methods == ["POST", "GET", "GET", "GET"]
    assert bodies[0]["background"] is True and bodies[0]["store"] is False
    assert bodies[0]["model"] == "gpt-5.5"
    task = json.loads((tmp_path / "provider-task.json").read_text())
    assert task["response_id"] == "resp_test" and task["status"] == "completed"


def test_background_creation_disconnect_is_never_automatically_retried(tmp_path, monkeypatch):
    monkeypatch.setenv("TEST_PROVIDER_KEY", "offline-value")
    methods = []

    def handle(request):
        methods.append(request.method)
        raise httpx.RemoteProtocolError("No response headers")

    settings = {"key_env": "TEST_PROVIDER_KEY", "endpoint": "https://example.test/v1/responses"}
    with (
        httpx.Client(transport=httpx.MockTransport(handle)) as client,
        pytest.raises(httpx.RemoteProtocolError),
    ):
        background_response({}, settings, tmp_path, client=client, sleep=lambda _: None)
    assert methods == ["POST"]


def test_only_connection_establishment_is_retried_and_releases_unused_reserve(
    tmp_path, monkeypatch
):
    monkeypatch.setenv("TEST_PROVIDER_KEY", "offline-value")
    attempts = []

    def handle(request):
        attempts.append(request.method)
        raise httpx.ConnectError("TLS handshake failed")

    settings = {"key_env": "TEST_PROVIDER_KEY", "endpoint": "https://example.test/v1/responses"}
    with (
        httpx.Client(transport=httpx.MockTransport(handle)) as client,
        pytest.raises(RequestNotSubmitted),
    ):
        background_response({}, settings, tmp_path, client=client, sleep=lambda _: None)
    assert attempts == ["POST"] * 3
    receipt = tmp_path / "receipt.json"
    original = json.dumps(
        {"status": "uncertain", "error_type": "RequestNotSubmitted", "reserved_usd": 1.6}
    )
    receipt.write_text(original)
    release_unsent_reserve(tmp_path)
    assert json.loads(receipt.read_text())["reserved_usd"] == 0
    assert (tmp_path / "unsent-reserve-original.json").read_text() == original
    assert (
        recovery_mode({"status": "failed", "error": "connection_unavailable"}, tmp_path)
        == "restart"
    )


def test_ambiguous_post_cannot_release_a_charge_reserve(tmp_path):
    receipt = tmp_path / "receipt.json"
    original = '{"status":"uncertain","error_type":"RemoteProtocolError","reserved_usd":1.6}'
    receipt.write_text(original)
    with pytest.raises(ValueError, match="proven connection failure"):
        release_unsent_reserve(tmp_path)
    assert receipt.read_text() == original
