from fastapi.testclient import TestClient

from autodraftman_backend.core.database import get_session
from autodraftman_backend.main import create_app


def test_live_health_and_request_id() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["X-Request-ID"]


def test_openapi_excludes_generation_and_payment_modules() -> None:
    with TestClient(create_app()) as client:
        paths = client.get("/openapi.json").json()["paths"]

    assert "post" in paths["/api/v1/identity/guest"]
    assert "/api/v1/identity/me" in paths
    assert "/api/v1/auth/providers" in paths
    assert "/api/v1/auth/oauth/{provider}/start" in paths
    assert "/api/v1/auth/oauth/{provider}/callback" in paths
    assert "/api/v1/auth/identities" in paths
    assert "/api/v1/auth/logout" in paths
    assert "/api/v1/credits/balance" in paths
    assert "/api/v1/assets" in paths
    assert not any("generation" in path for path in paths)
    assert not any("payment" in path or "order" in path for path in paths)


def test_readiness_reports_unavailable_when_postgres_cannot_be_reached() -> None:
    class UnavailableSession:
        async def execute(self, _statement):
            raise ConnectionRefusedError

    async def unavailable_session():
        yield UnavailableSession()

    application = create_app()
    application.dependency_overrides[get_session] = unavailable_session

    with TestClient(application) as client:
        response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
