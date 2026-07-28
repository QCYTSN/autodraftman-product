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
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GOOGLE_CLIENT_SECRET=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_ID=
AUTODRAFTMAN_OAUTH_GITHUB_CLIENT_SECRET=
AUTODRAFTMAN_S3_ENDPOINT_URL=
AUTODRAFTMAN_S3_REGION=
AUTODRAFTMAN_S3_BUCKET=
AUTODRAFTMAN_S3_ACCESS_KEY_ID=
AUTODRAFTMAN_S3_SECRET_ACCESS_KEY=
```

Only ports 80 and 443 should be public. PostgreSQL must not expose port 5432 to
the Internet. Concrete production Compose and reverse-proxy files will be added
after the cloud provider and domain are selected.
