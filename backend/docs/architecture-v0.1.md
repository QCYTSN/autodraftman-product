# AutoDraftman backend architecture v0.1

## Goal

Provide a production-shaped foundation for a product expected to serve at most a few thousand
users in its first public stage. The design should scale by moving standard components to managed
services, not by rewriting the application into microservices.

## Current boundary

```text
React frontend
      |
      v
FastAPI modular monolith
      |
      +-- PostgreSQL: identities, sessions, assets, credit ledger
      |
      +-- S3-compatible object storage boundary: image bytes
```

The image-generation kernel is outside this boundary. No generation request contract, mock
generator, queue, or worker is included until the kernel's runtime behavior is known.

## Decisions

### PostgreSQL only

Development, integration testing, and production use PostgreSQL. SQLite is intentionally rejected
by configuration so concurrency and migration differences cannot be hidden during development.

### Modular monolith

Identity, credits, assets, and health are separate domain modules in one deployable service. For
the expected scale this is easier to operate and test than independently deployed services.

### Opaque server-managed sessions

Guest cookies contain a random opaque token. Only its SHA-256 hash is stored. The frontend
explicitly starts or restores a guest session through `POST /api/v1/identity/guest`; ordinary
protected reads do not create identities. A new guest, credit account, and initial grant ledger
entry are created atomically in one database transaction.

Google OAuth will later create a `User` plus an `AuthIdentity`; the schema allows one user to link
multiple providers.

### Auditable credits

`CreditAccount` keeps the current available and reserved values. Every mutation must also append a
`CreditTransaction` with post-transaction balances and an idempotency key. The future generation
flow will use:

```text
grant       (+available)
reserve     (-available, +reserved)
settle      (reserved consumed)
release     (+available, -reserved)
refund      (+available)
```

No payment or order tables exist until a payment provider and product policy are selected.

### Private asset metadata

Image bytes never enter PostgreSQL. Asset rows store an S3-compatible provider, bucket, random
object key, media metadata, ownership, and visibility. Permanent public URLs are not stored.
Access will use short-lived presigned URLs.

Asset rows also record expiry, deletion, scheduled purge, and completed purge timestamps. Guest
content expires after seven days. A user deletion removes access immediately and schedules object
deletion within 24 hours. See `docs/data-retention-policy.md` at the repository root.

### Honest health reporting

`/health/live` means the process can answer HTTP. `/health/ready` additionally verifies PostgreSQL
connectivity and returns 503 when the database is unavailable.

## Tables

```mermaid
erDiagram
    USERS ||--o{ AUTH_IDENTITIES : has
    USERS ||--o{ USER_SESSIONS : has
    USERS ||--o| CREDIT_ACCOUNTS : owns
    GUEST_IDENTITIES ||--o| CREDIT_ACCOUNTS : owns
    CREDIT_ACCOUNTS ||--o{ CREDIT_TRANSACTIONS : records
    USERS ||--o{ ASSETS : owns
    GUEST_IDENTITIES ||--o{ ASSETS : owns
```

## Deployment evolution

### Development

- FastAPI container
- PostgreSQL container
- local or development S3-compatible storage

### Shared internal environment

- one API container
- managed PostgreSQL with automated backups
- S3-compatible object storage
- error monitoring

### Public launch

- the same API code, optionally with a second instance
- managed PostgreSQL connection pooling
- CDN/WAF and rate limiting
- object lifecycle policies for short-lived guest data
- scheduled asset purge and account purge commands

### After the generation kernel is measured

Add one durable queue and one or more worker processes. Queue selection depends on measured task
duration, cancellation behavior, retry safety, progress reporting, and GPU placement. Redis and
Celery are not assumed in advance.

## Known limitation

Server-side guest identities make allowance grants auditable, but an anonymous user can still
clear cookies or switch devices. Before public free usage, add rate limiting and bot/risk controls;
do not describe the cookie alone as a strict one-person-one-grant mechanism.
