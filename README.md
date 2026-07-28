# AutoDraftman Product

This repository is the source of truth for the AutoDraftman web product.
Research experiments and generated runs remain in the original FYP repository.

## Structure

```text
frontend/   React and Vite product interface
backend/    FastAPI, PostgreSQL, identity, credits, and asset metadata
deploy/     Production deployment files and runbooks
docs/       Product-level decisions and repository policy
```

The image-generation kernel is intentionally outside this repository until its
runtime contract is known.

## Local development

Start PostgreSQL and the API:

```powershell
Set-Location backend
Copy-Item .env.example .env
docker compose up --build
```

Start the frontend in another terminal:

```powershell
Set-Location frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

The frontend is available at `http://127.0.0.1:5173` and the API at
`http://127.0.0.1:8000`.

## Validation

```powershell
Set-Location frontend
npm ci
npm run build
npm run review:quality

Set-Location ..\backend
python -m pip install -e ".[dev]"
python -m pytest
python -m ruff check .
```

## Deployment boundary

The current `compose.yaml` is for development only. Production deployment must
use separate credentials, private PostgreSQL networking, HTTPS, backups, and
object storage. See `deploy/README.md`.

Never commit `.env`, OAuth secrets, database passwords, private keys, uploaded
research images, database files, or generated user content.
