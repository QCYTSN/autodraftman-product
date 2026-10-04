# Repository policy

## Source of truth

This repository owns the product frontend and backend. The current
`LawrenceRiver/FigFox` repository (locally `FigFox-926`) owns research experiments
and the generation kernel. The public `QCYTSN/figfox` repository is currently a deployment
mirror for the static preview and must not become a second feature-development
source.

## Branches

- `main` must remain buildable.
- Feature work uses short-lived branches.
- Database schema changes require an Alembic migration.
- Public deployment happens only from a reviewed commit.

## Secrets and user data

- Keep local values in `.env`; commit only `.env.example`.
- OAuth client secrets belong only on the backend.
- Do not persist permanent public URLs for private images.
- Do not commit uploads, generated images, database volumes, logs containing
  prompts, or production backups.

## Product boundaries

Until the generation kernel is measured, do not add a queue implementation,
mock generation contract, payment schema, or GPU worker assumptions. Identity,
credits, assets, deployment, and observability should remain independent of the
kernel.
