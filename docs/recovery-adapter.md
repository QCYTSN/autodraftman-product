# Product recovery boundary

This change fixes product admission around the pinned `21ffc012` kernel. It does
not change models, prompts, image attachments, SAM settings/timeouts, SVG
operations, original receipts or conservative uncertainty reservations.

## Existing work and new charges

An authenticated owner may retrieve a bound provider task, replay a verified saved
answer, or perform local completion without topping their job allocation up to $5.
The gateway only allows this when the private worker reports both an eligible
recovery mode and an enabled account stage guard, for the same job revision.
Older workers continue to require the whole-run hold.

Immediately before each unsent G0/G1/G2 request, the worker checks the existing
shared budget and the account's active generation grant and budget. The account
row and owned-job row are locked in that order. The worker commits enough account
allocation for retained charges/reserves plus the next original stage's maximum
request cost before forwarding it. No request inputs are modified. A disabled
grant, insufficient budget or unavailable account database pauses before sending.
Cached receipts retain the upstream transport's identity and hash verification.

Account pauses do not consume the original preflight retry allowance. Continuing
is manual. No new automatic generation or retries are introduced.

## Precisely added recovery states

- Completed G0 response, before `initial.svg` was saved: requires retained, nonmock
  SAM evidence matching the source and every asset hash.
- Completed G1 response, before `G1/model.json` was saved: requires a verified draft
  and valid saved JSON answer.
- Existing completed-G2/local-finalization and bound-background retrieval remain.

Source/config identity, response hash, draft hash and parsed-model checks remain.
The original transport checks the reconstructed input hash when reusing responses.
Malformed or mismatched evidence remains a failure. Nothing fabricates manifests,
edits failed answers or converts provider failure into success. The original
failed-terminal-usage limitation and SAM's 120-second timeout remain outside scope.

## Configuration and release

The account-controlled worker requires:

```dotenv
FIGFOX_ACCOUNT_BUDGETS_REQUIRED=1
FIGFOX_ACCOUNT_SETTINGS=/etc/figfox/gateway.env
```

The second file supplies the existing private account database configuration. It
is readable only by the service user/group; no credentials go to browser code.
The standalone local worker keeps its existing behavior. For local internal-account
testing, start an idle worker with `scripts/start-local-kernel.ps1 -InternalAccounts`
and the existing `backend/.env.internal`. This flag does not restart an already
running worker; stop it only after its current task has finished.

Use `deploy/install-gateway.sh FULL_SHA backend.tar.gz SHA256 recovery` for a
coordinated backend update. It runs the offline suite against a separate test
database, backs up production PostgreSQL, closes gateway admission, verifies no
queued/running jobs and an idle worker lock, then updates only the product backend
release. Kernel/runtime paths and persistent task storage remain in place. A
rollback also checks for active work before restarting the worker. Account caps,
shared limits, task records, results and receipts are not reset by deployment.

## Verification

`test_stage_account_gate.py` verifies saved callbacks proceed without new quota,
every unsent stage is stopped by account/shared guards, input objects are forwarded
unchanged, and account lookup failures fail closed. PostgreSQL tests cover account
ownership, insufficient quota, grant revocation, concurrent reservations and the
gateway's recovery admission. Recovery tests reject malformed answers, changed
drafts, missing/mocked SAM evidence and mismatched identities. All use synthetic
state; no real image or paid model request is submitted.
