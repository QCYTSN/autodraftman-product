"""Zero-network differential test: upstream entry vs the actual web worker.

Recorded HTTP bodies, attachment bytes, prompts, stage order and final artifacts
must match. SAM/model responses are deterministic test fixtures, not live evidence.
"""

import argparse
import base64
import copy
import hashlib
import io
import json
import os
import sys
import tempfile
import uuid
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch
from urllib.request import urlopen as local_urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend/src"))
from PIL import Image  # noqa: E402

from autodraftman_backend.local_reconstruction.input_count import (  # noqa: E402
    InputCountUnavailable,
    count_input_tokens,
)
from autodraftman_backend.local_reconstruction.kernel_contract import (  # noqa: E402
    COMMIT,
    CONFIG_SOURCE,
    PROFILE,
    runtime_config,
    upstream_config,
    verify_kernel,
)
from autodraftman_backend.local_reconstruction.settings import Settings  # noqa: E402
from autodraftman_backend.local_reconstruction.store import JobStore  # noqa: E402
from autodraftman_backend.local_reconstruction.worker import run as web_run  # noqa: E402


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def check_case(root, kernel, size, crop_count, failure_stage=None):
    from figfox_plus.factual import pipeline
    from figfox_plus.native import pipeline as native

    root.mkdir()
    source = root / "source.png"
    Image.new("RGBA", size, (255, 255, 255, 190)).save(source)
    assets = []
    for index in range(crop_count):
        image = root / f"crop-{index}.png"
        Image.new("RGBA", (12, 10), (index * 20, 100, 90, 180)).save(image)
        assets.append(
            {
                "id": f"asset_{index}",
                "path": str(image),
                "role": "arrow_hint" if index == crop_count - 1 else "picture",
                "source_hash": sha(source),
                "source_crop": [index, 0, 12, 10],
                "asset_hash": sha(image),
                "representation": "raster",
            }
        )
    sam = {"source_hash": sha(source), "assets": assets, "status": {"sam": "ok"}}
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size[0]}" height="{size[1]}">'
        '<rect id="r" width="10" height="10" fill="red"/></svg>'
    )
    if crop_count:
        # Exercise real upstream asset binding and coordinate restoration, not
        # just attachment forwarding. The last asset is an arrow-evidence crop.
        svg = svg.replace('</svg>', '<image id="photo" href="asset_0" x="40" '
                          'y="40" width="8" height="8"/></svg>')
    g1 = {
        "regions": [
            {
                "id": region,
                "status": "no_confirmed_difference",
                "evidence": "paired views checked",
            }
            for region in "ABCD"
        ],
        "issues": [],
        "fact_inventory": [
            {
                "id": "f1",
                "region": "A",
                "kind": "geometry",
                "source_reading": "rectangle",
                "initial_reading": "rectangle",
                "source_box": [0, 0, 10, 10],
                "initial_box": [0, 0, 10, 10],
                "certainty": "clear",
                "source_basis": "paired crop",
            }
        ],
    }
    g2 = {
        "fact_checks": [
            {
                "fact_id": "f1",
                "decision": "confirmed",
                "source_evidence": "paired crop",
                "source_reading": "rectangle",
                "initial_reading": "rectangle",
            }
        ],
        "additional_issues": [],
        "transactions": [],
        "unresolved": [],
    }
    if crop_count:
        g1["regions"][0]["status"] = "differences"
        g1["issues"] = [
            {
                "id": "A1",
                "region": "A",
                "source_evidence": "blue rectangle",
                "initial_evidence": "red rectangle",
                "bbox": [0, 0, 10, 10],
                "repair": "Change the rectangle fill to blue",
            }
        ]
        g1["detail_requests"] = [
            {
                "fact_id": "f1",
                "reason": "Inspect the rectangle",
                "source_box": [0, 0, 10, 10],
                "initial_box": [0, 0, 10, 10],
            }
        ]
        g2["transactions"] = [
            {
                "id": "t1",
                "issue_ids": ["A1"],
                "target_ids": ["r"],
                "depends_on": [],
                "instructions": "Change only rectangle fill",
                "parameters": {
                    "operations": [
                        {"op": "set", "id": "r", "attributes": {"fill": "blue"}}
                    ]
                },
                "postconditions": ["The rectangle is blue"],
            }
        ]
        g1["issues"].append({**g1["issues"][0], "id": "A2", "repair": "Review uncertain boundary"})
        g2["unresolved"] = [{"issue_id": "A2", "reason": "Boundary is ambiguous in this fixture"}]
    responses = [svg, json.dumps(g1), json.dumps(g2)]
    original_config = upstream_config(kernel)
    config = runtime_config(kernel)
    assert {**config, "budget_usd": original_config["budget_usd"]} == original_config
    assert set(config["stages"]) == {"G0", "G1", "G2"}
    for provider in config["stages"].values():
        assert provider["model"] == "gpt-5.5"
        assert provider["protocol"] == "responses"
        assert provider["key_env"] == "OPENAI_API_KEY"
    cfg = root / "config.json"
    cfg.write_text(json.dumps(config), encoding="utf-8")

    counted_requests = []

    def capture(target):
        def send(request, **kwargs):
            if request.full_url.startswith(("file:", "data:")):
                return local_urlopen(request, **kwargs)
            body = json.loads(request.data)
            if request.full_url == "https://api.openai.com/v1/responses/input_tokens":
                counted_requests.append(body)
                return io.BytesIO(b'{"object":"response.input_tokens","input_tokens":1000}')
            assert request.full_url == "https://api.openai.com/v1/responses"
            assert body["model"] == "gpt-5.5"
            assert body["reasoning"] == {"effort": "medium"}
            target.append(
                {
                    "url": request.full_url,
                    "body": body,
                    "timeout": kwargs.get("timeout"),
                }
            )
            if failure_stage == ("G0", "G1", "G2")[len(target) - 1]:
                raise TimeoutError("Offline stage failure")
            text = responses[len(target) - 1]
            usage = {"input_tokens": 10, "output_tokens": 10}
            raw = {
                "status": "completed",
                "output": [{"content": [{"type": "output_text", "text": text}]}],
                "usage": usage,
            }
            return io.BytesIO(json.dumps(raw).encode())

        return send

    original_calls, web_calls = [], []
    with patch.object(native, "prepare_assets", lambda *a, **kw: copy.deepcopy(sam)):
        with patch("urllib.request.urlopen", capture(original_calls)):
            try:
                original = pipeline.run(
                    source, root / "original", config=original_config
                )
            except TimeoutError:
                assert failure_stage
            else:
                assert failure_stage is None
        settings = Settings(
            kernel, root / "web", root / "absent.env", cfg, total_budget=5
        )
        store = JobStore(settings.data)
        job = store.create(str(uuid.uuid4()), "fixture", "source.png", "fixture")
        folder = settings.data / "jobs" / job["id"]
        folder.mkdir(parents=True)
        (folder / "source.png").write_bytes(source.read_bytes())
        (folder / "input.json").write_text('{"prompt":""}')
        with patch("urllib.request.urlopen", capture(web_calls)):
            assert web_run(job["id"], settings) == (1 if failure_stage else 0), (
                folder / "failure.txt"
            ).read_text()
    assert web_calls == original_calls, (
        "The web adapter changed an upstream HTTP request"
    )
    assert counted_requests == [
        {k: item["body"][k] for k in ("model", "input", "reasoning")}
        for item in web_calls
    ], "Counting and generation must receive the same unchanged multimodal input"
    result = store.get(job["id"])
    if failure_stage:
        assert len(web_calls) == ("G0", "G1", "G2").index(failure_stage) + 1
        assert result["status"] == "failed"
        assert (
            result["stage"]
            == {"G0": "reconstruct", "G1": "inspect", "G2": "repair"}[failure_stage]
        )
        assert result["failure"]["retryable"] is False
        assert result["failure"]["billing"] == "unconfirmed"
        receipt = json.loads(
            (folder / f"run/{failure_stage}/call/receipt.json").read_text()
        )
        assert receipt["status"] == "uncertain" and receipt["reserved_usd"] > 0
        # An explicit second invocation must also retain the uncertain request, not resend it.
        before = copy.deepcopy(web_calls)
        with patch("urllib.request.urlopen", capture(web_calls)):
            assert web_run(job["id"], settings) == 1
        assert web_calls == before
        return {
            "failure_stage": failure_stage,
            "requests_equal": True,
            "models": [item["body"]["model"] for item in web_calls],
            "deepseek_calls": 0,
            "resend_calls": 0,
            "uncertain_reserve_retained": True,
            "count_requests": len(counted_requests),
        }
    assert len(web_calls) == 3
    assert result["status"] == "succeeded"
    assert result["result"]["unresolvedCount"] == len(g2["unresolved"])
    if crop_count:
        final_text = (folder / "run/final.svg").read_text()
        assert base64.b64encode(Path(assets[0]["path"]).read_bytes()).decode() in final_text
        placement = json.loads((folder / "run/G0/first-sam-placement.json").read_text())
        assert placement[0]["source_box"] == [0, 0, 12, 10]
        photo = next(node for node in ET.fromstring(final_text).iter() if node.get("id") == "photo")
        assert [float(photo.get(key)) for key in ("x", "y", "width", "height")] == [0, 0, 12, 10]
    events = json.loads((folder / "events.json").read_text())
    assert [event["stage"] for event in events] == [
        "reconstruct",
        "inspect",
        "repair",
        "finalize",
    ]
    assert sha(folder / "run/final.svg") == original["final_sha256"]
    assert sha(folder / "run/final.png") == original["png_sha256"]
    for file in (
        "G1/model.json",
        "G2/model.json",
        "implementation.json",
        "native-acceptance.json",
    ):
        assert (folder / "run" / file).read_bytes() == (
            root / "original" / file
        ).read_bytes()
    before = copy.deepcopy(web_calls)
    with patch("urllib.request.urlopen", capture(web_calls)):
        assert web_run(job["id"], settings) == 0
    assert web_calls == before, "A completed run submitted another request"
    return {
        "size": list(size),
        "sam_crops": crop_count,
        "sam_arrow_crops": int(crop_count > 0),
        "asset_binding_verified": crop_count > 0,
        "unresolved_count": result["result"]["unresolvedCount"],
        "requests_equal": True,
        "models": [item["body"]["model"] for item in web_calls],
        "endpoints": [item["url"] for item in web_calls],
        "deepseek_calls": 0,
        "count_requests": len(counted_requests),
        "progress_stages": [event["stage"] for event in events],
        "body_sha256": [
            hashlib.sha256(json.dumps(item, sort_keys=True).encode()).hexdigest()
            for item in web_calls
        ],
        "outputs_equal": True,
        "executed_operations": original["native_acceptance"]["executed_operations"],
        "completed_reuse_calls": 0,
    }


def check_capacity(root, kernel):
    """Synthetic crops only: exercise the exact guard without sending a real image."""
    from figfox_plus.factual import transport

    root.mkdir()
    image = root / "synthetic-7x8.png"
    Image.new("RGB", (7, 8), "white").save(image)
    images = [image] * 20
    provider = {**runtime_config(kernel)["stages"]["G0"], "budget_usd": 5}
    generation_bodies = []
    count_bodies = []

    def generation(body):
        generation_bodies.append(body)
        return {
            "status": "completed",
            "output": [{"content": [{"type": "output_text", "text": "fixture"}]}],
            "usage": {"input_tokens": 1000, "output_tokens": 10},
        }

    try:
        transport.request(root / "original", "unchanged", images, provider, http=generation)
    except ValueError as error:
        assert "input bound before HTTP" in str(error)
    else:
        raise AssertionError("Expected the upstream small-crop false positive")
    assert not generation_bodies
    records = []
    for index, count in enumerate((1000, 131072, 131073, None)):
        folder = root / f"count-{index}"
        before = len(generation_bodies)

        def counting(request, *, mock_count=count, **kwargs):
            assert request.full_url == "https://api.openai.com/v1/responses/input_tokens"
            count_bodies.append(json.loads(request.data))
            if mock_count is None:
                raise TimeoutError("Offline count timeout")
            return io.BytesIO(json.dumps({
                "object": "response.input_tokens", "input_tokens": mock_count,
            }).encode())

        with patch("urllib.request.urlopen", counting):
            try:
                result = transport.request(
                    folder, "unchanged", images, provider, http=generation,
                    input_token_counter=count_input_tokens,
                )
            except InputCountUnavailable:
                assert count is None
            except ValueError as error:
                assert count == 131073 and "input bound before HTTP" in str(error)
            else:
                assert count in (1000, 131072) and result == "fixture"
                assert count_bodies[-1] == {
                    k: generation_bodies[-1][k] for k in ("model", "input", "reasoning")
                }
                assert len(generation_bodies[-1]["input"][0]["content"]) == 21
        expected_generation = count in (1000, 131072)
        assert len(generation_bodies) - before == int(expected_generation)
        assert (folder / "receipt.json").exists() == expected_generation
        records.append({
            "mock_count": count, "generation_dispatched_to_fixture": expected_generation,
        })
    assert len(count_bodies) == 4
    return {"synthetic_attachments": 20, "upstream_rejected": True, "cases": records}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    kernel = ROOT / f"data/kernel/FigFox-{COMMIT}"
    proof = verify_kernel(kernel)
    sys.path.insert(0, str(kernel / "src"))
    with (
        tempfile.TemporaryDirectory(prefix="figfox-parity-") as folder,
        patch.dict(
            os.environ,
            {
                "OPENAI_API_KEY": "offline-fixture",
            },
        ),
        patch(
            "socket.socket.connect",
            side_effect=AssertionError("Network forbidden in parity test"),
        ),
    ):
        # No DS credential is present; an unexpected remote call also fails at socket level.
        os.environ.pop("DEEPSEEK_API_KEY", None)
        cases = [
            check_case(Path(folder) / str(i), kernel, size, crops)
            for i, (size, crops) in enumerate([((80, 64), 0), ((609, 277), 3)])
        ]
        failures = [
            check_case(Path(folder) / stage, kernel, (80, 64), 0, failure_stage=stage)
            for stage in ("G0", "G1", "G2")
        ]
        capacity = check_capacity(Path(folder) / "capacity", kernel)
    report = {
        "commit": COMMIT,
        "profile": PROFILE,
        "config_source": CONFIG_SOURCE,
        "declared_overrides": {"budget_usd": 5},
        "source_files_checked": proof["files_checked"],
        "portability_patches": proof["portability_patches"],
        "input_count_patches": proof["input_count_patches"],
        "cases": cases,
        "failure_cases": failures,
        "input_capacity": capacity,
        "network_requests": 0,
        "paid_calls": 0,
        "scope": (
            "Generation bodies and outputs match upstream for offline fixtures; "
            "extra input-count requests are mocked and verified; no live validation"
        ),
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
