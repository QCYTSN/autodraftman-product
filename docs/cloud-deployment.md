# FigFox cloud internal test deployment

Deployment target: `figfoxserve`, `asia-southeast1-c`, Ubuntu 24.04 x86_64.
Public workspace: `https://34.143.155.158/workspace`.
The existing `https://qcytsn.github.io/figfox/` showcase remains the public entry.

## Scope and frozen pipeline

The application release is based on product commit `8e0bb3e` and pinned FigFox
kernel `21ffc01271904d6c5610f0f96afd84530968f11e`. This deployment adds service
definitions, Linux paths, a web proxy and the Pages-to-cloud navigation link.
It does not modify the reconstruction adapter, prompts, models, image sizes,
SAM parameters, stage order, native edit execution, receipts or retry policy.

The chain remains **SAM → GPT G0 → GPT G1 → GPT G2 → native SVG execution and
rendering**. The SAM wrapper imports the existing bridge and overrides only its
DrawAI source, SAM source and writable runtime directories. CPU execution is the
existing local configuration, not a cloud fallback that bypasses segmentation.

## Access boundary

| Listener | Exposure | Purpose |
| --- | --- | --- |
| 443 | Public HTTPS | Website and authenticated `/api/v1/` gateway |
| 80 | Public HTTP | ACME certificate challenges only; other paths return 404 |
| 8080 | Loopback | Private troubleshooting frontend |
| 8788 | Loopback | Account and ownership gateway |
| 8787 | Loopback | Original reconstruction service |
| 18080 | Loopback | Original SAM bridge |
| 5432 | Loopback | PostgreSQL account database |

Only `figfox01` through `figfox04` have internal generation grants. Password
hashes and existing task ownership were migrated, not recreated. Every task and
result request is checked by the backend. Anonymous requests return 401; foreign
task IDs return 404. The public build uses the same-origin gateway, not the raw
bridge. Public registration is not enabled.

Production sessions use the `figfox_cloud_session` Secure, HttpOnly cookie.
The allowed browser origin is exactly `https://34.143.155.158`. The GitHub Pages
build navigates to the cloud product; it does not exchange cross-site cookies.

## Files and services

- `/opt/figfox/current`: release symlink; release files and runtime code are
  root-owned, readable by `figfox`, and not writable by the application user.
- `/opt/figfox/runtime/{backend,sam}`: isolated Python environments.
- `/opt/figfox/runtime/sam-assets`: unchanged local bridge and original sources.
- `/var/lib/figfox/sam3`: SAM weights/cache; `/var/lib/figfox/browser`: Chromium.
- `/var/lib/figfox/reconstruction`: persistent jobs, artifacts, receipts and limits.
- `/var/lib/figfox/backups`: migration snapshots; keep these private.
- `/var/lib/figfox/checks`: offline test/parity evidence.
- `/var/www/figfox-cloud`: built public frontend only.
- `/etc/figfox/{runtime,gateway,openai}.env`: private server configuration.
- `/etc/figfox/nginx.conf` and `/etc/figfox/http.d/`: private and public web routes.

`figfox-sam`, `figfox-reconstruction`, `figfox-gateway` and `figfox-web` are enabled
system services. Model/API secrets, account databases, uploads and backups must
never be copied into the web root or committed.

## Certificate renewal

The IP certificate is installed at `/etc/letsencrypt/live/figfox-ip/` and was
issued using Certbot 5.4's webroot IP support. Short-lived certificates require
automatic renewal: `figfox-certificate.timer` checks twice daily, with randomized
delay, and reloads only the web service after renewal. Leave port 80 available for
the challenge path. The renewal dry run succeeded on 2026-11-06.

Run these checks in Google Cloud browser SSH (or an authenticated SSH session):

```bash
sudo systemctl status figfox-web figfox-gateway figfox-reconstruction figfox-sam --no-pager
sudo systemctl list-timers figfox-certificate.timer --no-pager
sudo /opt/figfox/runtime/certbot/bin/certbot renew --dry-run --run-deploy-hooks --no-random-sleep-on-renew
sudo nginx -t -c /etc/figfox/nginx.conf
```

The IP has not been confirmed reserved. Reserve this existing address in Google
Cloud before relying on it across stop/start cycles. If it changes, update the
certificate, Nginx server name, gateway origin/URLs and Pages build URL together.

## Persistent state and cutover

The migration preserved 12 existing jobs (7 failed, 5 succeeded), ownership,
receipts and unsettled reservations. At cutover the cumulative limit was
`$14.944726`, exposure was `$12.041381`, and remaining allowance was `$2.903345`.
The per-image `$5` cap was unchanged. These are migration values, not an automatic
reset or a promise of current balance after future user runs.

The Windows reconstruction process was stopped after confirming no active task
and checking the frozen files. Its files remain intact. Keep only one active
generation deployment for this ledger; do not start the old Windows copy beside
the cloud worker with an independent copy of the allowance.

Before future migrations or rollbacks, stop new submissions and allow active
work to finish. Take a consistent reconstruction snapshot and PostgreSQL dump,
preserving both task ownership and the receipts/reservations. Changing the code
symlink must never replace `/var/lib/figfox/reconstruction` with an older backup.

## Verification and release

Completed on Ubuntu: 150 backend tests against an isolated test database; frozen
kernel parity with zero network requests and paid calls; original SAM CPU model
initialization; native SVG rendering under service restrictions; and a production
frontend build. Account/login/ownership checks use existing task reads only.
Public HTTPS browser checks passed for all four accounts, Secure/HttpOnly
sessions, history reads, three cross-account denials and logout. Anonymous task
reads return 401; raw bridge and data paths return 404. Pages preview navigation
to cloud workspace/login/docs passed. The showcase's 12 research regression
checks passed, including data, charts, motion, responsive layout and deep links.
No cloud image generation was submitted during deployment. A real end-to-end
generation is reserved for the user's manual action in the workspace.

For the Pages entry, build from `frontend/` with
`VITE_CLOUD_APP_URL=https://34.143.155.158` and `npm run build:pages` for local
verification. Commit and push the reviewed source, install the matching
`deploy/pages-workflow.yml` in `QCYTSN/figfox`, then run
`node deploy/publish-pages.mjs <full-source-SHA>`. The workflow rebuilds that exact
source and records both source SHA and cloud URL in `_release.json`. Historical
mirror frontend files and the portfolio's `site/figfox/` are not release inputs.
The cloud URL is used only in `github-pages` mode. Build the cloud frontend with internal
reconstruction enabled and `VITE_API_BASE_URL=/`; never deploy local-kernel mode.

The deployment does not migrate browser-local unsaved drafts between origins.
Server-owned history and results are preserved. Save/export an existing local
editing document before changing its browser origin.
