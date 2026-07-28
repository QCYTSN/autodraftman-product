# AutoDraftman backend foundation

This directory contains the product backend that is independent from the image-generation
kernel. It is intentionally a modular monolith.

Included in v0.1:

- FastAPI application and health endpoints
- PostgreSQL-only SQLAlchemy models
- Alembic migrations
- server-managed guest identities
- explicit guest-session creation; protected reads never create identities as a side effect
- one-credit guest grant recorded in an auditable ledger
- real Google and GitHub OAuth with state and PKCE
- formal HttpOnly user sessions, logout, account linking, and unlinking
- atomic guest-to-user asset and credit migration
- one free allowance per registered user, including repeat guest-login protection
- provider discovery that hides login methods without backend credentials
- asset metadata and an S3-compatible storage boundary
- Docker development environment

Deliberately excluded:

- generation API or mock generator
- Redis, Celery, GPU workers
- payments, orders, subscriptions
- admin and team workspaces

The decisions and staged deployment model are documented in
[`docs/architecture-v0.1.md`](docs/architecture-v0.1.md).

## Local development

Docker Desktop or another Docker runtime is required for the PostgreSQL development service.

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The API is then available at `http://127.0.0.1:8000`, with interactive documentation at
`http://127.0.0.1:8000/docs`.

The frontend starts or restores a guest session with `POST /api/v1/identity/guest`. After the
HttpOnly cookie is issued, `GET /api/v1/identity/me` and the credit and asset routes resolve the
same database identity. Requests without an active session receive `401`.

## Google and GitHub login

OAuth providers are disabled until both their client ID and secret are present in `.env`.
Secrets are read only by the backend and are never sent to the browser.

For local development, register these callback URLs:

```text
http://127.0.0.1:8000/api/v1/auth/oauth/google/callback
http://127.0.0.1:8000/api/v1/auth/oauth/github/callback
```

Then configure:

```text
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_SECRET=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_SECRET=
```

Use separate provider applications for development and production. In production, also set
`AUTODRAFTMAN_PUBLIC_API_URL` to the public HTTPS API origin, enable secure cookies, and set
`AUTODRAFTMAN_FRONTEND_URL` and CORS origins to the deployed frontend.

The backend does not merge accounts merely because two providers return the same email.
Another provider becomes a key to the same account only through the explicit linking flow.
WeChat remains intentionally disabled until an approved website application and credentials
exist.

Without Docker, install the package into a Python 3.12 environment and point
`AUTODRAFTMAN_DATABASE_URL` at a real PostgreSQL instance:

```powershell
python -m pip install -e ".[dev]"
alembic upgrade head
uvicorn autodraftman_backend.main:app --reload
```

Install the `s3` extra when exercising the concrete S3-compatible adapter:

```powershell
python -m pip install -e ".[dev,s3]"
```

## Important guest limitation

An anonymous browser receives a random opaque cookie whose hash is stored in PostgreSQL. This
prevents the credit grant from living only in frontend state, but clearing cookies or switching
devices can still create a new anonymous identity. When that browser later signs in, the initial
allowance transfers only if the registered account has not previously claimed it. Stronger
anonymous abuse prevention still requires rate limits and bot protection.

## Storage

The application stores only `bucket` and `object_key` metadata. The S3 boundary can produce
short-lived upload and download URLs once credentials are configured. Public permanent URLs
are not persisted.
