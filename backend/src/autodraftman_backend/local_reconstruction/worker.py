"""Executes the pinned factual kernel; events are emitted at actual stage boundaries."""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

from .failures import failure_details
from .inputs import pack_sam_inputs
from .locking import exclusive
from .settings import Settings, exposure, load_credentials
from .store import JobStore
from .streaming import install as install_streaming


def run(job_id: str, settings: Settings):
    store = JobStore(settings.data)
    job = settings.data / "jobs" / job_id
    request = json.loads((job / "input.json").read_text(encoding="utf-8"))
    os.environ.update(load_credentials(settings.credentials))
    os.environ.setdefault("PLUS_CHROMIUM", "C:/Program Files/Google/Chrome/Application/chrome.exe")
    sys.path.insert(0, str(settings.kernel / "src"))
    from figfox_plus.factual import pipeline, transport

    install_streaming(transport)

    config = json.loads(settings.config.read_text(encoding="utf-8"))
    config["local_transport"] = "responses-sse-v1"
    config["local_input_policy"] = "sam-contact-sheets-v1"
    config["budget_usd"] = min(
        config["budget_usd"], settings.total_budget - exposure(settings.data)
    )
    (job / "effective-config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    started = time.monotonic()
    events = []

    def stage(value):
        store.update(job_id, status="running", stage=value)
        events.append({"stage": value, "time": time.time()})
        (job / "events.json").write_text(json.dumps(events, indent=2), encoding="utf-8")

    try:
        stage("reconstruct")
        send_kernel = transport.sender(config, job / "run")

        def send(name, prompt, payload, images, folder):
            if name == "G1":
                stage("inspect")
            elif name == "G2":
                stage("repair")
            if name == "G0":
                prompt, images = pack_sam_inputs(
                    prompt,
                    payload,
                    images,
                    folder,
                    config["stages"][name]["max_input_tokens"]
                    - len(request["prompt"].encode("utf-8"))
                    - 128,
                )
            # Preserve the kernel prompts and bind the user's request explicitly to G0.
            if name == "G0" and request["prompt"]:
                prompt += (
                    "\nUser reconstruction notes "
                    "(preserve the source canvas and SVG safety rules):\n" + request["prompt"]
                )
            return send_kernel(name, prompt, payload, images, folder)

        original_render = pipeline.render

        def render(svg, png):
            if Path(svg).name == "final.svg":
                stage("finalize")
            return original_render(svg, png)

        pipeline.render = render
        result = pipeline.run(
            job / "source.png", job / "run", sam=True, repair=True, send=send, config=config
        )
        svg = job / "run/final.svg"
        png = job / "run/final.png"
        if (
            not svg.is_file()
            or not png.is_file()
            or result["final_sha256"] != hashlib.sha256(svg.read_bytes()).hexdigest()
            or result["png_sha256"] != hashlib.sha256(png.read_bytes()).hexdigest()
        ):
            raise ValueError("Result validation failed")
        known_cost = 0.0
        usage_known = True
        for receipt in (job / "run").glob("**/receipt.json"):
            usage = json.loads(receipt.read_text(encoding="utf-8"))
            usage_known &= usage.get("known_usd") is not None
            known_cost += usage.get("known_usd") or 0
        store.update(
            job_id,
            status="succeeded",
            stage="finalize",
            result={
                "svg": f"/local-api/jobs/{job_id}/result.svg",
                "png": f"/local-api/jobs/{job_id}/result.png",
                "costUsd": round(known_cost, 6) if usage_known else None,
                "elapsedSeconds": round(time.monotonic() - started, 2),
                "unresolvedCount": len(
                    (result.get("native_acceptance") or {}).get("unresolved", [])
                ),
                "sha256": result["final_sha256"],
            },
        )
    except Exception as error:
        # Keep detailed provider output on disk, never echo a credential or raw exception to UI.
        import traceback

        (job / "failure.txt").write_text(traceback.format_exc(), encoding="utf-8")
        details = failure_details(job, error)
        if store.get(job_id).get("retryCount", 0) >= 2:
            details["failure"]["retryable"] = False
        store.update(job_id, status="failed", **details)
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True)
    args = parser.parse_args()
    settings = Settings.from_env()
    with exclusive(settings.data / "worker.lock"):
        raise SystemExit(run(args.job, settings))
