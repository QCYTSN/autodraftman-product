# FigFox internal access

This layer adds four password accounts and task ownership in front of the existing reconstruction service. It reuses the product backend's `users`, `auth_identities`, `user_sessions` and credit-account identity relationships. It does not debit product credits or change the reconstruction ledger.

## Local use

- Login: `http://127.0.0.1:5179/login`.
- Accounts: `figfox01`, `figfox02`, `figfox03`, `figfox04`. Passwords were set separately by the administrator; none are in this repository.
- Start the account database, gateway and website with `powershell -File scripts/start-internal-access.ps1`.
- Existing reconstruction runtime remains on loopback port 8787 and is started with its existing launcher. This script never starts a generation, changes its configuration, or resets its budget.
- Local drafts and SVG editing documents are partitioned by account in the browser. Generated tasks/results are authorized on the server. An explicit anonymous-draft login copies that draft and its image into the account; it retains the anonymous source as a backup.
- A cross-tab account change refreshes the workspace, preventing old editing callbacks from operating under the new identity.
- The development-only `local-kernel` mode on port 5178 remains a trusted developer tool. **It is not an authenticated public entry point and must not be published.** Internal access uses `internal-test` on 5179 with no `/local-api` proxy or fallback.

## Configure a fresh environment

Use PostgreSQL and run `alembic upgrade head` in `backend/` against the intended database. Configure these additional backend settings in a private env file:

```dotenv
AUTODRAFTMAN_INTERNAL_ACCOUNTS_ENABLED=true
AUTODRAFTMAN_RECONSTRUCTION_GATEWAY_ENABLED=true
AUTODRAFTMAN_RECONSTRUCTION_BRIDGE_URL=http://127.0.0.1:8787
AUTODRAFTMAN_CORS_ORIGINS=http://127.0.0.1:5179,http://localhost:5179
AUTODRAFTMAN_FRONTEND_URL=http://127.0.0.1:5179
AUTODRAFTMAN_SESSION_COOKIE_NAME=figfox_internal_session
```

Also configure `AUTODRAFTMAN_DATABASE_URL` privately. On this workstation the isolated PostgreSQL database lives under ignored `data/internal-access/`, listens on `127.0.0.1:55432`, and uses SCRAM authentication. `backend/.env.internal` contains the connection details. It is separate from the frozen reconstruction database.

Provision accounts interactively, with the database settings loaded into the process environment:

```text
python -m autodraftman_backend.modules.internal_access.manage provision
python -m autodraftman_backend.modules.internal_access.manage disable --username figfox02
```

Provisioning accepts exactly those four names, reads passwords without echo, stores salted scrypt hashes, and revokes prior sessions when rotating passwords. A trusted administrator can alternatively supply the same username/password mapping through stdin using `--stdin-json`; do not put passwords in command arguments, checked-in files or logs. Disabling an account revokes all its sessions and its generation permission. There is no public registration endpoint.

## Authorization boundary

Every reconstruction endpoint requires an active product session and an enabled internal generation grant. Lists, reads, retries and downloads additionally require task ownership. Unknown and foreign task IDs return 404. Submissions/retries check the grant and session again after taking the submission lock. Login and mutating reconstruction calls require an exact trusted Origin.

Submission ownership is committed before forwarding. A server-generated UUID isolates upstream idempotency keys across accounts. An unconfirmed receipt is retained in the account's history with its original bytes and metadata. The user can explicitly confirm it using the same upstream UUID; there is no automatic model retry. After the bridge task is bound, the gateway deletes its duplicate input bytes. It does not reinterpret the original pipeline's recovery or billing rules.

Sensitive API responses use `Cache-Control: no-store`. Credentials use the existing HttpOnly cookie; production settings require Secure cookies. Persistent login throttles allow 10 attempts per account and 40 per source address per 15-minute window. Upload bodies are bounded before multipart parsing, including chunked requests. SVG downloads use a sandbox CSP and are checked for ownership.

## Production boundary

Public deployment is not enabled by this change. A future HTTPS deployment must serve the built frontend with `VITE_INTERNAL_RECONSTRUCTION=true` and `VITE_API_BASE_URL=/`, proxy only `/api/v1` to the authenticated backend, and use `AUTODRAFTMAN_ENVIRONMENT=production` plus `AUTODRAFTMAN_COOKIE_SECURE=true`. Set the exact public origin. Keep the reconstruction bridge, SAM service, PostgreSQL and private files off public interfaces; do not expose `/local-api` or development Vite ports. Use a separate database application role and a persistent private volume for the databases and reconstruction files. Proxy client-address trust must be restricted to the known local reverse proxy.

The original G0/G1/G2 calls, prompts, SAM materials, native SVG operations, recovery and fee handling are frozen. The new module never imports the kernel; it only forwards HTTP requests to the existing private service.

## Validation

- Backend: `pytest` for the existing offline suite. Set `FIGFOX_ACCESS_TEST_DATABASE_URL` to a migrated database whose name ends in `_test` to include the internal-access integration tests. These use real PostgreSQL with a synthetic bridge; they never invoke models or SAM. The test fixture truncates only that explicitly selected test database.
- Browser: run `npm run dev:internal`, then `npm run review:internal-access` in `frontend/`. Every `/api/v1` request is intercepted in this fixture and `/local-api` is forbidden. The fixture checks sign-in errors, explicit image carryover, simulated progress, cross-tab account isolation/logout, delayed image saving, storage failure and mobile layout. Screenshots are written to ignored `frontend/.review/internal-access/`.
- Private verification evidence and frozen-file hashes live under ignored `artifacts/internal-access/`. No user image was submitted for this change, and no test budget was modified.

Password hashing uses the [OWASP scrypt profile](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) with N=32768, r=8, p=3. The optional workstation database uses the [EDB PostgreSQL Windows binaries](https://productsdl.enterprisedb.com/download-postgresql-binaries); they are local tools, not repository artifacts.
