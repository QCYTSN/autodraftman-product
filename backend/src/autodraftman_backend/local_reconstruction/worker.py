"""Executes the pinned factual kernel; events are emitted at actual stage boundaries."""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

from .background import background_response, resumable_task
from .failures import failure_details
from .input_count import count_input_tokens
from .kernel_contract import (
    CONFIG_SOURCE,
    PROFILE,
    is_original_job,
    validate_config,
    verify_kernel,
)
from .locking import exclusive
from .recovery import retained_mode
from .settings import Settings, exposure, load_credentials
from .store import JobStore


def run(job_id: str, settings: Settings):
    store = JobStore(settings.data)
    job = settings.data / "jobs" / job_id
    request = json.loads((job / "input.json").read_text(encoding="utf-8"))
    os.environ.update(load_credentials(settings.credentials))
    os.environ.setdefault("PLUS_CHROMIUM", "C:/Program Files/Google/Chrome/Application/chrome.exe")
    sys.path.insert(0, str(settings.kernel / "src"))
    saved_config = job / "effective-config.json"
    if saved_config.exists():
        # Historical adapted jobs are retained, but cannot enter a different protocol.
        config = json.loads(saved_config.read_text(encoding="utf-8"))
    else:
        config = json.loads(settings.config.read_text(encoding="utf-8"))
        config["budget_usd"] = min(
            config["budget_usd"], settings.total_budget - exposure(settings.data)
        )
        saved_config.write_text(json.dumps(config, indent=2), encoding="utf-8")
    started = time.monotonic()
    snapshot = store.get(job_id)
    previous_seconds = snapshot.get("processingSeconds", 0)
    events_file = job / "events.json"
    events = json.loads(events_file.read_text(encoding="utf-8")) if events_file.exists() else []

    def stage(value):
        store.update(job_id, status="running", stage=value)
        events.append({"stage": value, "time": time.time()})
        (job / "events.json").write_text(json.dumps(events, indent=2), encoding="utf-8")

    try:
        if saved_config.exists() and (job / "run").exists() and not is_original_job(job):
            raise ValueError("original contract mismatch: legacy adapted task")
        if request["prompt"].strip():
            raise ValueError("original prompt unsupported")
        proof = verify_kernel(settings.kernel)
        validate_config(config, settings.kernel)
        from figfox_plus.factual import pipeline, transport

        (job / "adapter-contract.json").write_text(
            json.dumps(
                {
                    "profile": PROFILE,
                    "config_source": CONFIG_SOURCE,
                    **proof,
                    "declared_overrides": {"budget_usd": config["budget_usd"]},
                    "config_sha256": hashlib.sha256(saved_config.read_bytes()).hexdigest(),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        stage(snapshot.get("resumeStage") or "reconstruct")
        send_kernel = transport.sender(config, job / "run")

        def send(name, prompt, payload, images, folder):
            if name == "G1":
                stage("inspect")
            elif name == "G2":
                stage("repair")
            provider = config["stages"][name]
            if not (folder / "receipt.json").exists():
                reserve = (
                    provider["max_input_tokens"] * provider["input_usd_per_million"]
                    + provider["max_output_tokens"] * provider["output_usd_per_million"]
                ) / 1e6
                if reserve > settings.total_budget - exposure(settings.data):
                    raise ValueError("request reserve exceeds cumulative budget")
            # Forward upstream prompts, payloads and attachment objects unchanged.
            # Upstream owns request bodies, limits, transport and response parsing.
            return send_kernel(name, prompt, payload, images, folder)

        original_render = pipeline.render
        original_request = transport.request

        def render(svg, png):
            if Path(svg).name == "final.svg":
                stage("finalize")
            return original_render(svg, png)

        def connected_request(folder, prompt, images, provider, *, http=None):
            return original_request(
                folder,
                prompt,
                images,
                provider,
                http=http or (lambda body: background_response(body, provider, folder)),
                input_token_counter=count_input_tokens,
                resume_request=resumable_task,
            )

        def retained_first(image, folder, sam, send):
            # Rebuild the identical upstream request from frozen, hash-checked
            # assets. Retrieving a paid response must not rerun the SAM service.
            from figfox_plus.native.document import serialize
            from figfox_plus.native.pipeline import first

            manifest = json.loads((folder / "sam.json").read_text(encoding="utf-8"))
            if manifest.get("legacy_injected_fixture"):
                raise ValueError("original contract mismatch: unverified SAM assets")

            def forward(prompt, images, run_dir, purpose):
                return send("G0", prompt, {}, images, folder / "call")

            return serialize(
                first(
                    image,
                    folder,
                    send=forward,
                    sam=manifest,
                    capabilities={"version": "capabilities-v1", "sam": sam, "code_methods": False},
                )
            )

        retained_g0 = (job / "run/G0/call/receipt.json").exists()
        pipeline.render = render
        transport.request = connected_request
        try:
            result = pipeline.run(
                job / "source.png",
                job / "run",
                sam=True,
                repair=True,
                send=send,
                config=config,
                g0_builder=retained_first if retained_g0 else None,
            )
        finally:
            pipeline.render = original_render
            transport.request = original_request
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
        reserved_cost = 0.0
        usage_known = True
        for receipt in (job / "run").glob("**/receipt.json"):
            usage = json.loads(receipt.read_text(encoding="utf-8"))
            usage_known &= usage.get("known_usd") is not None
            known_cost += usage.get("known_usd") or 0
            reserved_cost += usage.get("reserved_usd") or 0
        store.update(
            job_id,
            status="succeeded",
            stage="finalize",
            processingSeconds=round(previous_seconds + time.monotonic() - started, 2),
            result={
                "svg": f"/local-api/jobs/{job_id}/result.svg",
                "png": f"/local-api/jobs/{job_id}/result.png",
                "costUsd": round(known_cost, 6) if usage_known else None,
                "knownCostUsd": round(known_cost, 6),
                "reservedCostUsd": round(reserved_cost, 6),
                "elapsedSeconds": round(previous_seconds + time.monotonic() - started, 2),
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
        details = failure_details(job, error, store.get(job_id).get("stage"))
        if store.get(job_id).get(
            "preflightRetryCount", store.get(job_id).get("retryCount", 0)
        ) >= 2 and not retained_mode(job):
            details["failure"]["retryable"] = False
        store.update(
            job_id,
            status="failed",
            processingSeconds=round(previous_seconds + time.monotonic() - started, 2),
            **details,
        )
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--job", required=True)
    args = parser.parse_args()
    settings = Settings.from_env()
    with exclusive(settings.data / "worker.lock"):
        raise SystemExit(run(args.job, settings))
