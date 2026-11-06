# Deployment

## Current release

The showcase and workspace share [FigFox](https://qcytsn.github.io/figfox/).
Pages serves the frontend; `https://34.143.155.158/api/v1/` serves the authenticated
API. The four internal accounts retain their existing task ownership and history.
The cloud site's cookie-based sign-in remains available during the transition.
See [cloud deployment](../docs/cloud-deployment.md) for services, state, HTTPS
renewal and the unchanged generation pipeline.

The only production source is a reviewed, full commit SHA in
`QCYTSN/autodraftman-product`. The `QCYTSN/figfox` repository hosts the Pages
workflow; its historical `site/` directory is no longer a build input.
Ordinary pushes to that repository do **not** deploy anything.

## Release procedure

1. Build and inspect the product source:
   set `VITE_API_BASE_URL=https://34.143.155.158`,
   `VITE_INTERNAL_RECONSTRUCTION=true`, `VITE_SESSION_TRANSPORT=bearer`, then run
   `npm run build:pages`, `npm run review:research` and
   `node scripts/pages-workspace-check.mjs` in `frontend/`.
   Serve with `vite preview --mode github-pages` for the built `/figfox/` path.
2. Commit and push the reviewed source, including generated public assets.
3. Run from the source checkout:
   `node deploy/publish-pages.mjs <full-40-character-source-SHA>`.
4. Follow the [Pages workflow](https://github.com/QCYTSN/figfox/actions/workflows/deploy-pages.yml).
   It checks out that exact source commit, runs `npm ci` and `npm run build:pages`,
   verifies HEAD and writes `_release.json` from the actual checked-out revision.
5. Verify the live `/figfox/_release.json` matches the requested SHA, then check
   research data, images, navigation and a refreshed product route.

A reviewed feature-branch commit is valid; a source-main merge is not required.
The helper rejects dirty tracked files, untracked release files, an unpushed SHA
or a deployed workflow that differs from the reviewed template.

`deploy/pages-workflow.yml` is the versioned template for
`QCYTSN/figfox/.github/workflows/deploy-pages.yml`. Install template changes there
before releasing. Its only trigger is `workflow_dispatch`, with a required full
source SHA. There is no mirror-copy or ordinary-push publishing path.
To roll back, explicitly dispatch a previously reviewed source SHA.

## Pages session transport

The gateway explicitly enables `https://qcytsn.github.io` in both
`AUTODRAFTMAN_CORS_ORIGINS` and `AUTODRAFTMAN_BEARER_ORIGINS`. Bearer transport
defaults to disabled. It reuses the existing opaque, revocable server session;
it introduces no account migration or change to the reconstruction pipeline.
The Pages frontend keeps its session in tab-scoped `sessionStorage`, sends it
only to the configured API, and fetches private result previews as blob URLs.
It does not rely on third-party cookies or place credentials in resource URLs.
Tabs may sign into separate accounts. Closing the tab requires signing in again.
All sites under `qcytsn.github.io` share a browser origin; publish only trusted
code there. A future dedicated domain can use the existing cookie transport.

Server-side tasks/results remain with their accounts. Browser-local drafts and
SVG edits on the old IP origin remain there; they are not silently migrated.
The old cloud entry can export those SVGs for import into the Pages workspace.

Gateway releases can be installed independently with `deploy/install-gateway.sh`.
Its archive contains only tracked backend source, runs the isolated test database
suite before switching, backs up PostgreSQL and applies additive migrations, and
restarts only `figfox-gateway`. It keeps the previous
release/config for rollback. SAM, reconstruction workers and their state are untouched.

## Internal account budgets

Each account has an independent lifetime USD cap; new accounts default to zero.
An administrator can set the four existing accounts' caps with
`python -m autodraftman_backend.modules.internal_access.manage budget --limit-usd 50`
in the gateway environment. This changes neither passwords nor sessions and does
not reset spending. Historical jobs are reserved until their existing billing
snapshots are reconciled. Known fees and unresolved provider reserves both count.

The gateway durably reserves the original whole-run maximum of $5 before submission
or recovery. Terminal receipts settle that hold. Unknown billing keeps the hold;
an accepted request with a lost reply keeps the same job and reservation. Account
locks serialize admission, including concurrent tabs and retries. A fresh job needs
at least $5 remaining; the original per-job cap, prompts and execution stay unchanged.
Health reports `budgetLimitUsd`, `allocatedBudgetUsd`, `remainingBudgetUsd` and
`runReserveUsd` for the authenticated account, counting all history.

The worker's existing shared guard remains a second boundary. For the four $50
accounts, configure it to cover $200 plus retained historical unowned exposure.
Back up `test-limits.json` and all billing state first; update only its cumulative
cap. A worker restart is required to load this configuration and must happen only
with admission stopped and no active job. Never clear receipts to restore balance.

## Future general-availability API deployment

The development Compose file is not a production deployment. The cloud internal
test above runs the original reconstruction pipeline through its dedicated
gateway; the broader product infrastructure below is a separate future scope.

The first shared environment will contain:

1. HTTPS reverse proxy
2. FigFox API container
3. PostgreSQL with private networking and automated backups
4. S3-compatible object storage for reference and result images
5. Error monitoring and health checks

Production configuration must provide:

```text
AUTODRAFTMAN_ENVIRONMENT=production
AUTODRAFTMAN_DATABASE_URL=
AUTODRAFTMAN_CORS_ORIGINS=
AUTODRAFTMAN_COOKIE_SECURE=true
AUTODRAFTMAN_COOKIE_SAMESITE=lax
AUTODRAFTMAN_FRONTEND_URL=
AUTODRAFTMAN_PUBLIC_API_URL=
AUTODRAFTMAN_GUEST_CONTENT_TTL_DAYS=7
AUTODRAFTMAN_ASSET_DELETE_GRACE_HOURS=24
AUTODRAFTMAN_ACCOUNT_PURGE_DAYS=30
AUTODRAFTMAN_BACKUP_RETENTION_DAYS=30
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_SECRET=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_SECRET=
AUTODRAFTMAN_S3_ENDPOINT_URL=
AUTODRAFTMAN_S3_PUBLIC_ENDPOINT_URL=
AUTODRAFTMAN_S3_REGION=
AUTODRAFTMAN_S3_BUCKET=
AUTODRAFTMAN_S3_ACCESS_KEY_ID=
AUTODRAFTMAN_S3_SECRET_ACCESS_KEY=
```

Only ports 80 and 443 should be public. PostgreSQL must not expose port 5432 to
the Internet. The object store must remain private except for its HTTPS signed-URL
endpoint, with CORS restricted to the deployed frontend origins. Concrete production
Compose and reverse-proxy files will be added
after the cloud provider and domain are selected.

The production scheduler must run guest-expiry, object-purge, and account-purge
jobs. Backups must use a 30-day rolling retention policy and deleted content
must never be restored into the live product.
