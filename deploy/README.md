# Deployment

## Current static release

The showcase and local product tools are published at
[FigFox](https://qcytsn.github.io/figfox/). There is no hosted API in this release.

The only production source is a reviewed, full commit SHA in
`QCYTSN/autodraftman-product`. The `QCYTSN/figfox` repository hosts the Pages
workflow; its historical `site/` directory is no longer a build input.
Ordinary pushes to that repository do **not** deploy anything.

## Release procedure

1. Build and inspect the product source:
   `npm run build:pages`, `npm run review:research`,
   `npm run review:showcase` and `node scripts/verify-pages.mjs` in `frontend/`.
   Serve the built `/figfox/` path for browser checks.
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

## Future API deployment

The development Compose file is not a production deployment.

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
