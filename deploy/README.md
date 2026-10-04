# Deployment

## Current static release

The showcase, guide, proposed pricing, workspace and local SVG editor are published
at `https://qcytsn.github.io/figfox/`. There is no hosted API in this release.
`QCYTSN/autodraftman-product` remains the source repository;
`QCYTSN/figfox` contains a GitHub Pages mirror deployed from its `site/` directory.

Publish only after reviewing and committing the product source:

```powershell
Set-Location D:\Github_Ku\autodraftman-product\frontend
npm run build:pages
npm run review:pages
Set-Location ..
node deploy/publish-pages.mjs D:\Github_Ku\figfox-public-site
Set-Location D:\Github_Ku\figfox-public-site
git add site
git diff --cached --check
git commit -m "Publish FigFox product surfaces"
git push origin main
```

The copier verifies the mirror repository, clean source and mirror checkouts,
build base path, destination paths and copied bytes. It copies only static files,
removes individual obsolete files under `site/`, and leaves historical root files
alone. `_release.json` records the source revision. It does not push or change
GitHub settings. Wait for the Pages workflow, then verify the live home, product
routes, page refreshes, SVG editing and source revision.

The source commit may be on a reviewed feature branch. Publishing does not imply
merging that branch into source `main`.

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
