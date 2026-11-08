"""Exercise the product worker boundary with synthetic kernel callbacks only."""

import hashlib
import json
import sys
import uuid
from dataclasses import replace
from decimal import Decimal
from types import ModuleType, SimpleNamespace

import pytest

from autodraftman_backend.local_reconstruction import worker
from autodraftman_backend.local_reconstruction.account_gate import (
    AccountStagePaused,
    authorize_new_stage,
    retained_exposure,
)
from autodraftman_backend.local_reconstruction.settings import Settings
from autodraftman_backend.local_reconstruction.store import JobStore


@pytest.mark.parametrize("next_stage", ["G0", "G1", "G2", None])
@pytest.mark.parametrize("blocked_by", ["account", "shared"])
def test_worker_replays_without_new_budget_then_guards_first_unsent_stage(
    tmp_path, monkeypatch, next_stage, blocked_by,
):
    settings = Settings(tmp_path / "kernel", tmp_path / "state", tmp_path / "no-key",
                        tmp_path / "config.json", total_budget=5)
    store = JobStore(settings.data)
    job_id = store.create(str(uuid.uuid4()), "fixture", "synthetic.png", "")["id"]
    job = settings.data / "jobs" / job_id
    job.mkdir(parents=True)
    (job / "input.json").write_text('{"prompt":""}')
    names = ["G0", "G1", "G2"]
    cached = names if next_stage is None else names[:names.index(next_stage)]
    provider = {"max_input_tokens": 100, "max_output_tokens": 100,
                "input_usd_per_million": 5, "output_usd_per_million": 30}
    config = {"budget_usd": 5, "stages": dict.fromkeys(names, provider)}
    settings.config.write_text(json.dumps(config))
    (job / "effective-config.json").write_text(json.dumps(config))
    for name in cached:
        call = job / "run" / name / "call"
        call.mkdir(parents=True)
        (call / "receipt.json").write_text(json.dumps({
            "status": "completed", "known_usd": .1, "reserved_usd": 0,
        }))
    before = {p: p.read_bytes() for p in job.glob("**/receipt.json")}
    sent, checked = [], []
    prompt, payload, images = "unchanged upstream prompt", {"original": True}, [object()]

    def sender(*args):
        def send(name, actual_prompt, actual_payload, actual_images, folder):
            assert actual_prompt is prompt and actual_payload is payload and actual_images is images
            assert (folder / "receipt.json").exists(), "Unsent request crossed budget boundary"
            sent.append(name)
            return "cached answer"
        return send

    def account_check(*args):
        checked.append(True)
        raise AccountStagePaused("budget")

    def pipeline_run(source, run, *, send, **kwargs):
        for name in names:
            send(name, prompt, payload, images, run / name / "call")
        (run / "final.svg").write_bytes(b"synthetic final")
        (run / "final.png").write_bytes(b"synthetic rendered output")
        return {"final_sha256": hashlib.sha256((run / "final.svg").read_bytes()).hexdigest(),
                "png_sha256": hashlib.sha256((run / "final.png").read_bytes()).hexdigest()}

    factual = ModuleType("figfox_plus.factual")
    factual.pipeline = SimpleNamespace(run=pipeline_run, render=lambda *args: None)
    factual.transport = SimpleNamespace(sender=sender, request=lambda *args: None)
    package = ModuleType("figfox_plus")
    package.factual = factual
    monkeypatch.setitem(sys.modules, "figfox_plus", package)
    monkeypatch.setitem(sys.modules, "figfox_plus.factual", factual)
    monkeypatch.setattr(worker, "load_credentials", lambda _: {})
    monkeypatch.setattr(worker, "is_original_job", lambda _: True)
    monkeypatch.setattr(worker, "verify_kernel", lambda _: {})
    monkeypatch.setattr(worker, "validate_config", lambda *args: None)
    monkeypatch.setattr(worker, "exposure", lambda _: 5 if blocked_by == "shared" else .3)
    monkeypatch.setattr(worker, "authorize_new_stage", account_check)
    monkeypatch.setattr(worker, "retained_mode", lambda _: None)
    # Failed accounting is exercised elsewhere; these receipts deliberately contain
    # no upstream identity. This test isolates dispatch and input forwarding.
    result = worker.run(job_id, settings)
    assert sent == cached
    assert checked == ([True] if next_stage and blocked_by == "account" else [])
    assert all(path.read_bytes() == value for path, value in before.items())
    assert result == (1 if next_stage else 0)
    if next_stage:
        assert store.get(job_id)["error"] == (
            "account_budget_paused" if blocked_by == "account" else "budget_exceeded"
        )
        assert not (job / "run" / next_stage / "call/receipt.json").exists()


def test_account_guard_fails_closed_when_settings_or_database_unavailable(tmp_path, monkeypatch):
    settings = Settings(tmp_path, tmp_path, tmp_path / "no-key", tmp_path,
                        account_budgets_required=True)
    store = SimpleNamespace(request_key=lambda _: str(uuid.uuid4()))
    with pytest.raises(AccountStagePaused, match="check"):
        authorize_new_stage(settings, store, "synthetic", tmp_path, 1)
    config = tmp_path / "account.env"
    config.write_text("AUTODRAFTMAN_DATABASE_URL=postgresql+asyncpg://unused@localhost/unused_test")

    async def disconnected(*args):
        raise ConnectionError("synthetic database disconnect")

    monkeypatch.setattr(
        "autodraftman_backend.modules.internal_access.stage_budget.authorize", disconnected,
    )
    with pytest.raises(AccountStagePaused, match="check"):
        authorize_new_stage(replace(settings, account_settings_file=config), store,
                            "synthetic", tmp_path, 1)


def test_stage_accounting_retains_uncertain_charges_and_rejects_invalid_values(tmp_path):
    receipt = tmp_path / "receipt.json"
    receipt.write_text('{"known_usd":null,"reserved_usd":1.64}')
    assert retained_exposure(tmp_path) == Decimal("1.64")
    for invalid in ['{"known_usd":null,"reserved_usd":0}',
                    '{"known_usd":1,"reserved_usd":-1}',
                    '{"known_usd":true,"reserved_usd":0}', '{broken']:
        receipt.write_text(invalid)
        with pytest.raises(ValueError):
            retained_exposure(tmp_path)
