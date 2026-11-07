# Internal access verification — 2026-11-06

Scope: four internal password accounts, generation authorization, task ownership and browser account switching. The reconstruction engine, prompts, model roles, recovery and billing remain frozen.

| Check | Result |
| --- | --- |
| Backend tests | 150 passed, including 17 internal-access checks using isolated PostgreSQL and a synthetic bridge |
| Python lint | Passed |
| TypeScript and production frontend build | Passed |
| Browser internal flow | 8 checks passed; no page errors |
| Public build | Workspace, login and mobile smoke checks passed; zero API calls |
| Four configured local accounts | Real HTTP login, identity, empty own task list and logout verified |
| Frozen-file hashes | 5,267 checked, zero changes |
| Real image submissions / model calls during this work | Zero |
| Original job database and test limit | Hashes unchanged |

The internal browser checks intercepted every API request and used a synthetic one-pixel image. They covered wrong passwords, carrying a selected anonymous image into login, progress/result rendering, cross-tab account switching and logout, delayed image persistence, a failed target-cache write followed by recovery, and mobile layout. They do not claim a real end-to-end model run.

Backend checks covered authorization, foreign task/read/retry/download rejection, stable per-user idempotency, concurrent duplicate submissions, lost submission receipts visible after a new login, explicit confirmation with the original upstream request ID, session expiry/revocation, revocation while waiting for a submission lock, login throttling, oversized/chunked uploads, and safe artifact URLs.

Independent read-only reviews identified and verified the fixes for pending submission ownership, queued-request revocation, cross-tab identity consistency, account-scoped editor documents and safe anonymous-draft transfer.

Local evidence:

- `artifacts/internal-access/backend-tests.txt`
- `artifacts/internal-access/live-auth-smoke.json`
- `artifacts/internal-access/frozen-before.json` and `frozen-check.json`
- `frontend/.review/internal-access/result.json` and `public-smoke.json`
- Screenshots in `frontend/.review/internal-access/`: `login-desktop.png`, `login-mobile.png`, `workspace-ready.png`, `mock-progress.png`, `account-isolation.png`

Local data, passwords, connection strings and screenshots are excluded from Git. This change does not deploy or enable the private generation service on the public website. Existing build output reports a bundle-size advisory, and the backend suite reports an upstream Starlette test-client deprecation warning; neither failed validation.
