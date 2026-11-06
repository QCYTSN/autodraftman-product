"""Real PostgreSQL auth/ownership tests. All reconstruction calls are in-memory doubles.

Run with FIGFOX_ACCESS_TEST_DATABASE_URL pointing to a migrated *_test database.
No models, SAM, input counting, live reconstruction jobs or billing are accessed.
"""

import asyncio
import copy
import os
import uuid
from datetime import UTC, datetime, timedelta

import httpx
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from autodraftman_backend.core.config import Settings, get_settings
from autodraftman_backend.core.database import get_session
from autodraftman_backend.main import create_app
from autodraftman_backend.modules.identity.models import UserSession
from autodraftman_backend.modules.internal_access import manage, reconstruction
from autodraftman_backend.modules.internal_access.models import InternalAccount, OwnedReconstruction
from autodraftman_backend.modules.internal_access.passwords import hash_password, verify_password

TEST_PASSWORD = "synthetic-test-only-2026"
ORIGIN = "http://127.0.0.1:5179"


class FakeBridge:
    def __init__(self):
        self.calls = []
        self.jobs = {}
        self.drop_next_submission = False

    async def __call__(self, settings, method, path, **kwargs):
        self.calls.append((method, path, kwargs))
        if path == "/health":
            return httpx.Response(
                200,
                json={
                    "available": True,
                    "problems": [],
                    "supportsUserPrompt": False,
                    "remainingBudgetUsd": 5,
                },
            )
        if method == "POST" and path == "/jobs":
            key = kwargs["headers"]["Idempotency-Key"]
            if key not in self.jobs:
                identifier = uuid.uuid4().hex
                self.jobs[key] = {
                    "id": identifier,
                    "revision": 1,
                    "status": "running",
                    "stage": "reconstruct",
                    "draftId": kwargs["data"]["draftId"],
                    "name": "test.png",
                    "result": None,
                }
            if self.drop_next_submission:
                self.drop_next_submission = False
                raise HTTPException(503, "Simulated lost submission response")
            return httpx.Response(200, json=copy.deepcopy(self.jobs[key]))
        identifier = path.split("/")[2]
        job = next(job for job in self.jobs.values() if job["id"] == identifier)
        if path.endswith("/retry"):
            job["revision"] += 1
            return httpx.Response(200, json=copy.deepcopy(job))
        if "/result." in path:
            return httpx.Response(200, content=b"synthetic artifact")
        return httpx.Response(200, json=copy.deepcopy(job))


@pytest_asyncio.fixture(params=["cookie", "bearer"])
async def access(monkeypatch, request):
    url = os.environ.get("FIGFOX_ACCESS_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Set FIGFOX_ACCESS_TEST_DATABASE_URL for PostgreSQL integration coverage")
    if not url.split("?", 1)[0].endswith("_test"):
        raise RuntimeError("Internal access tests require an isolated *_test database")
    engine = create_async_engine(url)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.execute(text("TRUNCATE users, internal_login_throttles CASCADE"))
    monkeypatch.setattr(manage, "SessionFactory", sessions)
    await manage.provision(dict.fromkeys(manage.USERNAMES, TEST_PASSWORD))
    settings = Settings(
        _env_file=None,
        database_url=url,
        internal_accounts_enabled=True,
        reconstruction_gateway_enabled=True,
        cors_origins=ORIGIN,
        bearer_origins=ORIGIN,
    )
    monkeypatch.setattr("autodraftman_backend.main.get_settings", lambda: settings)
    app = create_app()

    async def session_dependency():
        async with sessions() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[get_session] = session_dependency
    fake = FakeBridge()
    monkeypatch.setattr(reconstruction, "bridge", fake)
    clients = []

    def client():
        instance = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url=ORIGIN, headers={"Origin": ORIGIN}
        )
        clients.append(instance)
        instance.figfox_transport = request.param
        return instance

    yield client, fake, sessions, settings
    for instance in clients:
        await instance.aclose()
    await engine.dispose()


async def login(client, username="figfox01", password=TEST_PASSWORD):
    response = await client.post(
        "/api/v1/auth/password",
        json={
            "username": username, "password": password,
            "session_transport": client.figfox_transport,
        },
    )
    if response.status_code == 200 and client.figfox_transport == "bearer":
        client.headers["Authorization"] = "Bearer " + response.json()["session_token"]
    return response


async def submit(client, key=None, image=b"synthetic input"):
    return await client.post(
        "/api/v1/reconstructions",
        headers={"Idempotency-Key": key or str(uuid.uuid4())},
        files={"image": ("test.png", image, "image/png")},
        data={"draftId": "test-draft", "prompt": ""},
    )


def test_password_hashes_are_salted_and_verified():
    first, second = hash_password(TEST_PASSWORD), hash_password(TEST_PASSWORD)
    assert first != second and TEST_PASSWORD not in first
    assert verify_password(TEST_PASSWORD, first)
    assert not verify_password("incorrect", first)
    assert not verify_password(TEST_PASSWORD, "malformed")


@pytest.mark.parametrize("username", manage.USERNAMES)
async def test_four_accounts_reuse_existing_identity_and_session(access, username):
    new, fake, _, _ = access
    client = new()
    response = await login(client, username)
    assert response.status_code == 200
    if client.figfox_transport == "cookie":
        assert "HttpOnly" in response.headers["set-cookie"]
        assert "session_token" not in response.json()
    else:
        assert "set-cookie" not in response.headers and not client.cookies
        assert response.headers["cache-control"] == "no-store"
    identity = (await client.get("/api/v1/identity/me")).json()
    assert identity["display_name"] == username and identity["providers"] == ["password"]
    assert (await client.get("/api/v1/reconstructions/health")).status_code == 200
    assert all(method == "GET" for method, _, _ in fake.calls)


async def test_wrong_unknown_password_and_validation_do_not_disclose_secrets(access):
    new, fake, _, _ = access
    client = new()
    wrong = await login(client, password="invalid-password")
    unknown = await login(client, username="unknown")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    invalid = await login(client, password="PRIVATE" * 100)
    assert invalid.status_code == 422 and "PRIVATE" not in invalid.text
    assert not client.cookies and not fake.calls


async def test_anonymous_and_cross_origin_never_reach_bridge(access):
    new, fake, _, _ = access
    client = new()
    assert (await submit(client)).status_code == 401
    assert (await client.get("/api/v1/reconstructions")).status_code == 401
    assert (await login(client)).status_code == 200
    client.headers["Origin"] = "https://attacker.invalid"
    assert (await submit(client)).status_code == 403
    assert (await login(client)).status_code == 403
    assert not fake.calls


async def test_logout_and_expiry_invalidate_access(access):
    new, fake, sessions, _ = access
    client = new()
    await login(client)
    cookies = dict(client.cookies)
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    client.cookies.update(cookies)
    assert (await submit(client)).status_code == 401
    await login(client)
    async with sessions() as session:
        await session.execute(
            update(UserSession).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
        )
        await session.commit()
    assert (await submit(client)).status_code == 401
    assert not fake.calls


async def test_disabling_or_revoking_generation_blocks_existing_session(access):
    new, fake, sessions, _ = access
    client = new()
    await login(client)
    async with sessions() as session:
        await session.execute(update(InternalAccount).values(generation_allowed=False))
        await session.commit()
    assert (await submit(client)).status_code == 403
    await manage.disable("figfox01")
    assert (await submit(client)).status_code == 401
    assert (await login(client)).status_code == 401
    assert not fake.calls


async def test_task_list_read_retry_and_artifacts_are_owner_only(access):
    new, fake, _, _ = access
    owner, other = new(), new()
    await login(owner)
    await login(other, "figfox02")
    job = (await submit(owner)).json()
    url = f"/api/v1/reconstructions/{job['id']}"
    calls_before = len(fake.calls)
    for suffix in ["", "/result.svg", "/result.png"]:
        assert (await other.get(url + suffix)).status_code == 404
    assert (await other.post(url + "/retry", json={"revision": 1})).status_code == 404
    assert (await other.get("/api/v1/reconstructions")).json() == []
    assert len(fake.calls) == calls_before
    assert (await owner.get(url)).status_code == 200
    assert (await owner.get(url + "/result.svg")).content == b"synthetic artifact"
    assert (await owner.post(url + "/retry", json={"revision": 1})).json()["revision"] == 2
    assert len((await owner.get("/api/v1/reconstructions")).json()) == 1


async def test_idempotency_is_per_owner_concurrent_and_byte_preserving(access):
    new, fake, _, _ = access
    first, second = new(), new()
    await login(first)
    await login(second, "figfox02")
    key = str(uuid.uuid4())
    responses = await asyncio.gather(submit(first, key), submit(first, key))
    assert responses[0].json()["id"] == responses[1].json()["id"]
    other = await submit(second, key)
    assert other.json()["id"] != responses[0].json()["id"]
    assert (await submit(first, key, b"different image")).status_code == 409
    writes = [
        options for method, path, options in fake.calls if method == "POST" and path == "/jobs"
    ]
    assert len(writes) == 2
    assert all(call["headers"]["Idempotency-Key"] != key for call in writes)
    assert all(call["files"]["image"][1] == b"synthetic input" for call in writes)
    assert all(call["data"] == {"prompt": "", "draftId": "test-draft"} for call in writes)


async def test_lost_submission_response_preserves_owner_and_bridge_key(access):
    new, fake, sessions, _ = access
    client = new()
    await login(client)
    fake.drop_next_submission = True
    key = str(uuid.uuid4())
    assert (await submit(client, key)).status_code == 503
    # A new browser session can discover and explicitly confirm the persisted submission.
    restored = new()
    await login(restored)
    pending = (await restored.get("/api/v1/reconstructions")).json()
    assert len(pending) == 1 and pending[0]["submissionPending"]
    assert (await restored.get(f"/api/v1/reconstructions/{pending[0]['id']}")).status_code == 200
    other = new()
    await login(other, "figfox02")
    assert (
        await other.post(f"/api/v1/reconstructions/{pending[0]['id']}/retry", json={"revision": 1})
    ).status_code == 404
    async with sessions() as session:
        owned = await session.scalar(select(OwnedReconstruction))
        assert owned and owned.bridge_job_id is None
    confirmed = await restored.post(
        f"/api/v1/reconstructions/{pending[0]['id']}/retry", json={"revision": 1}
    )
    assert confirmed.status_code == 200 and confirmed.json()["id"] == pending[0]["id"]
    async with sessions() as session:
        owned = await session.scalar(select(OwnedReconstruction))
        assert owned.source_bytes is None and owned.submission is None
    assert len(fake.jobs) == 1
    writes = [options for method, _, options in fake.calls if method == "POST"]
    assert writes[0]["headers"] == writes[1]["headers"]


async def test_login_throttle_is_persistent(access):
    new, fake, _, _ = access
    client = new()
    for _ in range(10):
        assert (await login(client, password="invalid-password")).status_code == 401
    limited = await login(new())
    assert limited.status_code == 429 and limited.headers["Retry-After"] == "900"
    assert not fake.calls


async def test_defaults_are_closed_and_upload_has_limit(access):
    new, fake, _, settings = access
    client = new()
    settings.internal_accounts_enabled = False
    assert (await login(client)).status_code == 404
    settings.internal_accounts_enabled = True
    await login(client)
    settings.reconstruction_gateway_enabled = False
    assert (await submit(client)).status_code == 503
    settings.reconstruction_gateway_enabled = True
    settings.asset_max_upload_bytes = 4
    assert (await submit(client)).status_code == 413
    assert not fake.calls


def test_gateway_rejects_private_artifact_mismatch():
    response = httpx.Response(
        200, json={"id": "a" * 32, "result": {"svg": "https://bad.invalid", "png": "bad"}}
    )
    with pytest.raises(HTTPException):
        reconstruction.snapshot(response)


async def test_oversized_bodies_are_rejected_before_multipart_parsing(access):
    new, fake, _, _ = access
    client = new()
    assert (await client.post("/api/v1/auth/password", content=b"x" * 4097)).status_code == 413

    async def chunks():
        for _ in range(12):
            yield b"x" * 1024 * 1024

    response = await client.post(
        "/api/v1/reconstructions",
        content=chunks(),
        headers={"Content-Type": "multipart/form-data; boundary=test"},
    )
    assert response.status_code == 413
    assert not fake.calls


async def test_revocation_while_waiting_for_submission_lock_blocks_retry(access, monkeypatch):
    new, fake, _, _ = access
    client = new()
    await login(client)
    entered, release, waiting = asyncio.Event(), asyncio.Event(), asyncio.Event()
    original_owned = reconstruction.owned_job

    async def waiting_owned(*args, **kwargs):
        if kwargs.get("lock"):
            waiting.set()
        return await original_owned(*args, **kwargs)

    async def blocked_bridge(*args, **kwargs):
        entered.set()
        await release.wait()
        return await fake(*args, **kwargs)

    monkeypatch.setattr(reconstruction, "owned_job", waiting_owned)
    monkeypatch.setattr(reconstruction, "bridge", blocked_bridge)
    fake.drop_next_submission = True
    first = asyncio.create_task(submit(client))
    await asyncio.wait_for(entered.wait(), 5)
    pending = (await client.get("/api/v1/reconstructions")).json()[0]
    retry = asyncio.create_task(client.post(
        f'/api/v1/reconstructions/{pending["id"]}/retry', json={"revision": 1},
    ))
    await asyncio.wait_for(waiting.wait(), 5)
    await manage.disable("figfox01")
    release.set()
    assert (await first).status_code == 503
    assert (await retry).status_code == 401
    assert len(fake.calls) == 1


async def test_explicit_bearer_never_falls_back_to_cookie_or_guest(access):
    new, fake, _, _ = access
    client = new()
    client.figfox_transport = "cookie"
    await login(client)
    for credential in ["Bearer " + "x" * 64, "Basic invalid", "Bearer malformed"]:
        client.headers["Authorization"] = credential
        assert (await client.get("/api/v1/identity/me")).status_code == 401
        assert (await client.post("/api/v1/identity/guest")).status_code == 401
        assert (await submit(client)).status_code == 401
    assert not fake.calls


async def test_bearer_requires_allowlisted_origin_for_issue_and_use(access):
    new, fake, _, settings = access
    client = new()
    client.figfox_transport = "bearer"
    await login(client)
    for origin in ["https://attacker.invalid", "null", None]:
        if origin is None:
            client.headers.pop("Origin", None)
        else:
            client.headers["Origin"] = origin
        assert (await client.get("/api/v1/identity/me")).status_code == 403
        assert (await login(client)).status_code == 403
    client.headers["Origin"] = ORIGIN
    settings.bearer_origins = ""
    assert (await client.get("/api/v1/identity/me")).status_code == 403
    assert (await login(client)).status_code == 403
    assert not fake.calls


async def test_pages_preflight_allows_authorization_only_for_trusted_origin(access):
    new, fake, _, _ = access
    client = new()
    headers = {
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization, content-type, idempotency-key",
    }
    response = await client.options("/api/v1/reconstructions", headers=headers)
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    headers["Origin"] = "https://attacker.invalid"
    denied = await client.options("/api/v1/reconstructions", headers=headers)
    assert denied.status_code == 400 and "access-control-allow-origin" not in denied.headers
    assert not fake.calls
