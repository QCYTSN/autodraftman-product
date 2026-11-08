import hashlib
import json
import zipfile

import httpx
import pytest

from autodraftman_backend.local_reconstruction import kernel_contract as contract
from autodraftman_backend.local_reconstruction.provider_check import model_problems
from autodraftman_backend.local_reconstruction.settings import load_credentials


def test_kernel_verification_rejects_changed_prompts_and_added_modules(tmp_path, monkeypatch):
    kernel = tmp_path / f"FigFox-{contract.COMMIT}"
    archive = tmp_path / "21ffc012.zip"
    files = {
        "prompts/factual/g1.md": "Original exact prompt\n",
        "src/figfox_plus/example.py": "x = 1\n",
    }
    with zipfile.ZipFile(archive, "w") as output:
        for path, content in files.items():
            output.writestr(f"{kernel.name}/{path}", content)
            target = kernel / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8", newline="\n")
    monkeypatch.setattr(
        contract, "ARCHIVE_SHA256", hashlib.sha256(archive.read_bytes()).hexdigest()
    )
    assert contract.verify_kernel(kernel)["files_checked"] == 2
    prompt = kernel / "prompts/factual/g1.md"
    prompt.write_text("Changed prompt", encoding="utf-8")
    with pytest.raises(contract.KernelContractError, match="g1.md"):
        contract.verify_kernel(kernel)
    prompt.write_text(files["prompts/factual/g1.md"], encoding="utf-8", newline="\n")
    (kernel / "src/figfox_plus/hidden_override.py").write_text("pass")
    with pytest.raises(contract.KernelContractError, match="hidden_override"):
        contract.verify_kernel(kernel)


@pytest.mark.parametrize("stage", ["G0", "G1", "G2"])
@pytest.mark.parametrize("change", ["model", "endpoint", "max_input_tokens", "background"])
def test_config_preserves_upstream_gpt_stages_with_only_budget_override(tmp_path, stage, change):
    (tmp_path / "configs").mkdir()
    upstream = {
        "budget_usd": 169.93383,
        "stages": {
            name: {"model": "gpt-5.5", "max_input_tokens": 131072} for name in ("G0", "G1", "G2")
        },
    }
    (tmp_path / contract.CONFIG_SOURCE).write_text(json.dumps(upstream))
    local = contract.runtime_config(tmp_path)
    assert {**local, "budget_usd": upstream["budget_usd"]} == upstream
    assert contract.upstream_config(tmp_path) == upstream
    contract.validate_config(local, tmp_path)
    local["stages"][stage][change] = "changed"
    with pytest.raises(contract.KernelContractError):
        contract.validate_config(local, tmp_path)


@pytest.mark.asyncio
async def test_model_preflight_only_lists_models_and_never_substitutes(monkeypatch):
    requests = []

    def handle(request):
        requests.append((request.method, str(request.url)))
        return httpx.Response(200, json={"data": [{"id": "gpt-5.5"}]})

    original_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: original_client(transport=httpx.MockTransport(handle), **kw),
    )
    config = {
        "stages": {
            stage: {
                "model": "gpt-5.5",
                "key_env": "OPENAI_API_KEY",
                "endpoint": "https://api.openai.com/v1/responses",
            }
            for stage in ("G0", "G1", "G2")
        }
    }
    assert await model_problems(config, {"OPENAI_API_KEY": "offline-fixture"}) == []
    assert requests == [("GET", "https://api.openai.com/v1/models")]
    assert config["stages"]["G1"]["model"] == "gpt-5.5"
    config["stages"]["G1"]["model"] = "unavailable-model"
    assert await model_problems(config, {"OPENAI_API_KEY": "offline-fixture"}) == [
        "model_unavailable:unavailable-model"
    ]


def test_local_credentials_only_load_openai(tmp_path, monkeypatch):
    path = tmp_path / "keys.env"
    path.write_text("OPENAI_API_KEY=fixture-gpt\nDEEPSEEK_API_KEY=fixture-ds\n")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "fixture-ds-environment")
    assert load_credentials(path) == {"OPENAI_API_KEY": "fixture-gpt"}
    monkeypatch.setenv("OPENAI_API_KEY", "fixture-gpt-environment")
    assert load_credentials(path) == {"OPENAI_API_KEY": "fixture-gpt-environment"}


def test_mixed_profile_cannot_resume_as_gpt_profile(tmp_path):
    proof = tmp_path / "adapter-contract.json"
    proof.write_text(json.dumps({"profile": "upstream-factual-ds41-v1", "commit": contract.COMMIT}))
    assert not contract.is_original_job(tmp_path)
    proof.write_text(json.dumps({"profile": contract.PROFILE, "commit": contract.COMMIT}))
    assert contract.is_original_job(tmp_path)
