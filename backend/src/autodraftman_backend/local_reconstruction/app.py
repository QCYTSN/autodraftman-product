"""Local-only reconstruction API. Deliberately not mounted in the cloud application."""

import asyncio
import hashlib
import io
import json
import os
import subprocess
import sys
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from PIL import Image, UnidentifiedImageError
from starlette.datastructures import UploadFile
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .failures import can_retry, failure_details
from .kernel_contract import PROFILE, validate_config
from .locking import busy, exclusive
from .provider_check import model_problems
from .recovery import is_unsent, recovery_mode
from .settings import KERNEL_COMMIT, ROOT, Settings, exposure, load_credentials
from .store import JobStore

MAX_UPLOAD = 10 * 1024 * 1024


def create_app(settings: Settings | None = None):
    settings = settings or Settings.from_env()
    store = JobStore(settings.data)
    submit_lock = asyncio.Lock()
    tasks: set[asyncio.Task] = set()
    process: subprocess.Popen | None = None
    stopping = False
    model_check = {"fingerprint": None, "checked": 0, "problems": []}
    model_check_lock = asyncio.Lock()

    @asynccontextmanager
    async def lifespan(_):
        nonlocal stopping
        with exclusive(settings.data / "service.lock"):
            stopping = False
            store.recover()
            try:
                yield
            finally:
                stopping = True
                if process and process.poll() is None:
                    process.terminate()
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

    async def recover_idle():
        # Serialize against submit: a queued worker may not hold worker.lock yet.
        async with submit_lock:
            if not tasks:
                store.recover()

    app = FastAPI(title="FigFox local reconstruction", lifespan=lifespan)
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "[::1]"])
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Idempotency-Key"],
    )

    @app.middleware("http")
    async def local_boundary(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.client and request.client.host not in ("127.0.0.1", "::1"):
            return JSONResponse({"detail": "Local access only"}, status_code=403)
        if origin and origin not in settings.origins:
            return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        if request.method == "POST" and request.headers.get("sec-fetch-site") == "cross-site":
            return JSONResponse({"detail": "Cross-site submission blocked"}, status_code=403)
        if request.method == "POST":
            try:
                size = int(request.headers.get("content-length", "0"))
            except ValueError:
                size = 0
            if size <= 0 or size > MAX_UPLOAD + 65536:
                return JSONResponse(
                    {"detail": "Upload too large or missing length"}, status_code=413
                )
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    async def readiness(*, existing_job=False, stage_name="G0", retrieval_config=None):
        problems = []
        if busy(settings.data / "worker.lock"):
            problems.append("worker_busy")
        minimum_reserve = 0
        if not (settings.kernel / "product-runtime-manifest.json").is_file():
            problems.append("kernel_missing")
        if retrieval_config is not None:
            try:
                validate_config(retrieval_config, settings.kernel)
                keys = load_credentials(settings.credentials)
                if any(
                    not keys.get(value["key_env"]) for value in retrieval_config["stages"].values()
                ):
                    problems.append("credentials_missing")
            except (OSError, ValueError, KeyError, TypeError):
                problems.append("config_invalid")
            return {"available": not problems, "problems": problems}
        if not settings.config.is_file():
            problems.append("config_missing")
        else:
            try:
                config = json.loads(settings.config.read_text(encoding="utf-8"))
                validate_config(config, settings.kernel)
                keys = load_credentials(settings.credentials)
                if any(not keys.get(value["key_env"]) for value in config["stages"].values()):
                    problems.append("credentials_missing")
                first = config["stages"][stage_name]
                minimum_reserve = (
                    first["max_input_tokens"] * first["input_usd_per_million"]
                    + first["max_output_tokens"] * first["output_usd_per_million"]
                ) / 1e6
                fingerprint = hashlib.sha256(
                    json.dumps([config, keys], sort_keys=True).encode()
                ).hexdigest()
                async with model_check_lock:
                    if (
                        fingerprint != model_check["fingerprint"]
                        or time.monotonic() - model_check["checked"] > 60
                    ):
                        model_check.update(
                            fingerprint=fingerprint,
                            checked=time.monotonic(),
                            problems=await model_problems(config, keys),
                        )
                problems.extend(model_check["problems"])
            except (OSError, ValueError, KeyError, TypeError):
                problems.append("config_invalid")
        try:
            async with httpx.AsyncClient(timeout=3, trust_env=False) as client:
                response = await client.get(settings.sam_url + "/health")
                response.raise_for_status()
        except httpx.HTTPError:
            problems.append("sam_unavailable")
        used = await asyncio.to_thread(exposure, settings.data)
        if used >= settings.total_budget or settings.total_budget - used < minimum_reserve:
            problems.append("budget_exceeded")
        if (
            not existing_job
            and settings.max_jobs is not None
            and store.count() >= settings.max_jobs
        ):
            problems.append("test_limit_reached")
        return {
            "service": "figfox-local-v1",
            "available": not problems,
            "problems": problems,
            "kernelCommit": KERNEL_COMMIT,
            "profile": PROFILE,
            "supportsUserPrompt": False,
            "sam": True,
            "remainingBudgetUsd": max(0, round(settings.total_budget - used, 6)),
            "remainingTestJobs": max(0, settings.max_jobs - store.count())
            if settings.max_jobs is not None
            else None,
        }

    @app.get("/local-api/health")
    async def health():
        return await readiness()

    @app.get("/local-api/jobs")
    async def jobs():
        await recover_idle()
        return store.list()

    async def execute(job):
        nonlocal process
        folder = settings.data / "jobs" / job["id"]

        def interrupted(error):
            current = store.get(job["id"])
            if current["status"] in ("queued", "running"):
                store.update(
                    job["id"],
                    status="failed",
                    **failure_details(folder, error, current.get("stage")),
                )

        if stopping:
            interrupted(InterruptedError())
            return
        environment = os.environ.copy()
        environment.update(
            PYTHONPATH=str(ROOT / "backend/src"),
            PYTHONUTF8="1",
            FIGFOX_KERNEL_DIR=str(settings.kernel),
            FIGFOX_LOCAL_DATA=str(settings.data),
            FIGFOX_KERNEL_ENV=str(settings.credentials),
            FIGFOX_KERNEL_CONFIG=str(settings.config),
        )
        try:
            with (folder / "worker.log").open("wb") as log:
                process = await asyncio.to_thread(
                    subprocess.Popen,
                    [
                        sys.executable,
                        "-m",
                        "autodraftman_backend.local_reconstruction.worker",
                        "--job",
                        job["id"],
                    ],
                    cwd=ROOT,
                    env=environment,
                    stdout=log,
                    stderr=log,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
                )
                if stopping and process.poll() is None:
                    process.terminate()
                try:
                    await asyncio.to_thread(process.wait, 3600)
                except subprocess.TimeoutExpired:
                    process.terminate()
                    await asyncio.to_thread(process.wait, 10)
                    interrupted(TimeoutError())
                    return
            interrupted(InterruptedError())
        except Exception:
            interrupted(InterruptedError())
        finally:
            process = None

    @app.post("/local-api/jobs", status_code=202)
    async def submit(request: Request):
        try:
            request_id = str(uuid.UUID(request.headers.get("Idempotency-Key", "")))
        except ValueError:
            raise HTTPException(400, "A UUID Idempotency-Key is required") from None
        async with request.form(max_files=1, max_fields=2, max_part_size=MAX_UPLOAD) as form:
            upload = form.get("image")
            prompt, draft_id = form.get("prompt", ""), form.get("draftId", "")
            if (
                not isinstance(upload, UploadFile)
                or not isinstance(prompt, str)
                or not isinstance(draft_id, str)
            ):
                raise HTTPException(400, "Invalid input")
            if len(prompt) > 1200 or len(draft_id) > 100:
                raise HTTPException(400, "Input text too long")
            if prompt.strip():
                raise HTTPException(
                    422, "The original kernel accepts an image without added prompts"
                )
            content = await upload.read(MAX_UPLOAD + 1)
            if len(content) > MAX_UPLOAD:
                raise HTTPException(413, "Image too large")
            name = Path((upload.filename or "source.png").replace("\\", "/")).name[:180]
        try:
            with Image.open(io.BytesIO(content)) as image:
                if (
                    image.format not in ("PNG", "JPEG", "WEBP")
                    or image.width * image.height > 20_000_000
                    or min(image.size) < 2
                ):
                    raise ValueError("Unsupported image")
                image.load()
                normalized = io.BytesIO()
                if image.format in ("PNG", "JPEG"):
                    # Upstream sees the exact upload bytes, including alpha and orientation.
                    normalized.write(content)
                    conversion = "none"
                else:
                    # Upstream transport only supports PNG/JPEG MIME types.
                    image.save(normalized, format="PNG")
                    conversion = "webp-to-png-same-pixels"
        except (ValueError, UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, "Invalid or unsupported image") from None
        fingerprint = hashlib.sha256(
            content + prompt.encode() + b"\0" + draft_id.encode()
        ).hexdigest()
        async with submit_lock:
            previous = store.by_request(request_id)
            if previous:
                if previous[0] != fingerprint:
                    raise HTTPException(409, "Idempotency key already belongs to different input")
                return previous[1]
            if tasks:
                raise HTTPException(409, "A reconstruction is already running")
            state = await readiness()
            if not state["available"]:
                raise HTTPException(503, {"code": "unavailable", "problems": state["problems"]})
            job = store.create(request_id, fingerprint, name, draft_id)
            folder = settings.data / "jobs" / job["id"]
            folder.mkdir(parents=True)
            (folder / "source.png").write_bytes(normalized.getvalue())
            (folder / "uploaded-original").write_bytes(content)
            (folder / "input.json").write_text(
                json.dumps(
                    {
                        "name": name,
                        "prompt": prompt,
                        "draftId": draft_id,
                        "uploaded_sha256": hashlib.sha256(content).hexdigest(),
                        "source_sha256": hashlib.sha256(normalized.getvalue()).hexdigest(),
                        "source_conversion": conversion,
                        "receivedAt": time.time(),
                    }
                ),
                encoding="utf-8",
            )
            task = asyncio.create_task(execute(job))
            tasks.add(task)
            task.add_done_callback(tasks.discard)
            return job

    @app.get("/local-api/jobs/{job_id}")
    async def status(job_id: str):
        await recover_idle()
        job = store.get(job_id)
        if job is None:
            raise HTTPException(404, "Task not found")
        return job

    @app.post("/local-api/jobs/{job_id}/retry", status_code=202)
    async def retry(job_id: str, request: Request):
        # The failed revision makes a double click/lost response an idempotent operation.
        try:
            body = await request.json()
        except ValueError:
            raise HTTPException(400, "A failed task revision is required") from None
        if not isinstance(body, dict) or type(body.get("revision")) is not int:
            raise HTTPException(400, "A failed task revision is required")
        async with submit_lock:
            job = store.get(job_id)
            if job is None:
                raise HTTPException(404, "Task not found")
            if job.get("retryOfRevision") == body["revision"]:
                return job
            folder = settings.data / "jobs" / job_id
            if body["revision"] != job["revision"] or not can_retry(job, folder):
                raise HTTPException(409, "This task cannot be retried safely")
            if tasks:
                raise HTTPException(409, "A reconstruction is already running")
            mode = recovery_mode(job, folder)
            pending = (
                {"inspect": "G1", "repair": "G2"}.get(job.get("stage"), "G0")
                if mode in ("resume", "background", "finalize")
                else "G0"
            )
            retrieval_config = None
            if mode in ("background", "finalize"):
                try:
                    retrieval_config = json.loads(
                        (folder / "effective-config.json").read_text(encoding="utf-8")
                    )
                except (OSError, ValueError):
                    raise HTTPException(409, "Recovery configuration is unavailable") from None
            state = await readiness(
                existing_job=True, stage_name=pending, retrieval_config=retrieval_config
            )
            if not state["available"]:
                raise HTTPException(503, {"code": "unavailable", "problems": state["problems"]})
            try:
                with exclusive(settings.data / "worker.lock"):
                    if not can_retry(job, folder):
                        raise OSError("Recovery evidence changed")
                    pending_call = folder / "run" / pending / "call"
                    pending_receipt = pending_call / "receipt.json"
                    if mode == "resume" and pending_receipt.exists() and is_unsent(pending_receipt):
                        retained = folder / "run" / pending / "unsent-calls" / str(job["revision"])
                        if not pending_call.resolve().is_relative_to(
                            folder.resolve()
                        ) or not retained.resolve().is_relative_to(folder.resolve()):
                            raise OSError("Recovery path outside task")
                        retained.parent.mkdir(parents=True, exist_ok=True)
                        pending_call.rename(retained)
                    archive = (
                        folder
                        / (
                            "resume-records"
                            if mode in ("resume", "background", "finalize")
                            else "preflight-attempts"
                        )
                        / str(job["revision"])
                    )
                    archive.mkdir(parents=True, exist_ok=False)
                    names = (
                        ("failure.txt", "worker.log")
                        if mode in ("resume", "background", "finalize")
                        else (
                            "run",
                            "failure.txt",
                            "events.json",
                            "effective-config.json",
                            "worker.log",
                        )
                    )
                    (archive / "snapshot.json").write_text(
                        json.dumps(job, indent=2), encoding="utf-8"
                    )
                    for name in names:
                        source = folder / name
                        if source.exists():
                            if not source.resolve().is_relative_to(
                                folder.resolve()
                            ) or not archive.resolve().is_relative_to(folder.resolve()):
                                raise OSError("Recovery path outside task")
                            source.rename(archive / name)
                    queued = store.update(
                        job_id,
                        status="queued",
                        stage=None,
                        error=None,
                        failure=None,
                        retryCount=job.get("retryCount", 0) + 1,
                        preflightRetryCount=job.get("preflightRetryCount", job.get("retryCount", 0))
                        + int(mode in ("restart", "resume")),
                        retryOfRevision=job["revision"],
                        resumeStage=job["stage"]
                        if mode in ("resume", "background", "finalize")
                        else None,
                    )
            except OSError:
                raise HTTPException(409, "Task recovery is not available yet") from None
            task = asyncio.create_task(execute(queued))
            tasks.add(task)
            task.add_done_callback(tasks.discard)
            return queued

    @app.get("/local-api/jobs/{job_id}/{artifact}")
    async def result(job_id: str, artifact: str):
        job = store.get(job_id)
        if not job or job["status"] != "succeeded" or artifact not in ("result.svg", "result.png"):
            raise HTTPException(404, "Result not available")
        kind = artifact.rsplit(".", 1)[1]
        return FileResponse(
            settings.data / "jobs" / job_id / "run" / f"final.{kind}",
            media_type="image/svg+xml" if kind == "svg" else "image/png",
            filename=f"{Path(job['name']).stem}-figfox.{kind}",
            headers={"Content-Security-Policy": "default-src 'none'; sandbox"},
        )

    return app


app = create_app()
