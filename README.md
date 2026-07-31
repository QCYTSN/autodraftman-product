# AutoDraftman Product

This repository is the source of truth for the AutoDraftman web product.
Research experiments and generated runs remain in the original FYP repository.

## Repository roles

- `QCYTSN/autodraftman-product` is the only active source repository for the
  product frontend, backend, product documentation, tests, and deployment
  configuration.
- `QCYTSN/autodraftman` is a static GitHub Pages deployment mirror. It may
  receive built assets from a reviewed product commit, but product features
  must not be edited there.
- `LawrenceRiver/fyp_AutoDraftman` remains the research and generation-kernel
  repository. Kernel work should enter this repository only through an agreed
  runtime or API contract.

Do not copy source changes back from a deployment mirror. Product development
starts here, is reviewed here, and is deployed outward from a known commit.

## Structure

```text
frontend/   React and Vite product interface, including local draft recovery
backend/    FastAPI, PostgreSQL, identity, credits, drafts, and asset metadata
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

## Product information pages

The bilingual product interface includes:

- `/docs` — user guide and current feature boundaries
- `/privacy` — privacy and retention policy draft
- `/terms` — internal-test terms draft
- `/content-policy` — responsible-use and scientific-integrity rules

These pages are intentionally marked as drafts. The operating entity, formal
contact channel, deployment regions, generation providers, payment terms, and
governing law must be confirmed before public testing.

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
