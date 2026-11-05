import hashlib
import json
import zipfile

import httpx
import pytest

from autodraftman_backend.local_reconstruction import kernel_contract as contract
from autodraftman_backend.local_reconstruction.provider_check import model_problems


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


@pytest.mark.parametrize("change", ["model", "max_input_tokens", "background"])
def test_config_allows_only_declared_model_update_and_local_budget(tmp_path, change):
    (tmp_path / "configs").mkdir()
    upstream = {
        "budget_usd": 169.93383,
        "stages": {
            "G0": {"model": "original", "max_input_tokens": 131072},
            "G1": {"model": "deepseek-v4-flash-vision-exp", "max_input_tokens": 131072},
            "G2": {"model": "deepseek-v4-flash-vision-exp", "max_input_tokens": 131072},
        },
    }
    (tmp_path / "configs/factual.json").write_text(json.dumps(upstream))
    local = contract.runtime_config(tmp_path)
    assert local["stages"]["G1"]["model"] == "deepseek-flash"
    assert local["stages"]["G2"]["max_input_tokens"] == 131072
    assert contract.upstream_config(tmp_path) == upstream
    contract.validate_config(local, tmp_path)
    local["stages"]["G0"][change] = "changed"
    with pytest.raises(contract.KernelContractError):
        contract.validate_config(local, tmp_path)
    local = contract.runtime_config(tmp_path)
    local["stages"]["G2"][change] = "changed"
    with pytest.raises(contract.KernelContractError):
        contract.validate_config(local, tmp_path)


@pytest.mark.asyncio
async def test_model_preflight_only_lists_models_and_never_substitutes(monkeypatch):
    requests = []

    def handle(request):
        requests.append((request.method, str(request.url)))
        return httpx.Response(200, json={"data": [{"id": "deepseek-flash"}]})

    original_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: original_client(transport=httpx.MockTransport(handle), **kw),
    )
    config = {
        "stages": {
            "G1": {
                "model": "deepseek-v4-flash-vision-exp",
                "key_env": "DS",
                "endpoint": "https://api.deepseek.com/chat/completions",
            }
        }
    }
    assert await model_problems(config, {"DS": "offline-fixture"}) == []
    assert requests == [("GET", "https://api.deepseek.com/models")]
    assert config["stages"]["G1"]["model"] == "deepseek-v4-flash-vision-exp"
    config["stages"]["G1"]["model"] = "unavailable-model"
    assert await model_problems(config, {"DS": "offline-fixture"}) == [
        "model_unavailable:unavailable-model"
    ]
