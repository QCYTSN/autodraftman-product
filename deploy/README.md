# Deployment

The development Compose file is not a production deployment.

The first shared environment will contain:

1. HTTPS reverse proxy
2. AutoDraftman API container
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
