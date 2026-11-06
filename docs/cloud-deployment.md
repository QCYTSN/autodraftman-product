# FigFox cloud internal test deployment

Deployment target: `figfoxserve`, `asia-southeast1-c`, Ubuntu 24.04 x86_64.
Public workspace: `https://qcytsn.github.io/figfox/workspace/`.
The showcase and product pages share the same GitHub Pages entry.
The existing `https://34.143.155.158/workspace` remains available during migration.

## Scope and frozen pipeline

The application release is based on product commit `8e0bb3e` and pinned FigFox
kernel `21ffc01271904d6c5610f0f96afd84530968f11e`. This deployment adds service
definitions, Linux paths, a web proxy and authenticated Pages-to-cloud API requests.
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
task IDs return 404. Both frontends use the ownership gateway, never the raw
bridge. Public registration is not enabled.

The cloud frontend uses the `figfox_cloud_session` Secure, HttpOnly cookie.
The GitHub Pages frontend uses the same opaque server sessions through an
explicitly enabled bearer transport, kept in tab-scoped sessionStorage. Only
`https://qcytsn.github.io` can request/use this transport; CORS allows that origin
and `https://34.143.155.158`. The Pages build stays on its own URL and does not
depend on third-party cookies. Result images are fetched with authentication
and displayed via local blob URLs. No credentials are placed in URLs.

## Files and services

- `/opt/figfox/current`: release symlink; release files and runtime code are
  root-owned, readable by `figfox`, and not writable by the application user.
- `/opt/figfox/runtime/{backend,sam}`: isolated Python environments.
- `/opt/figfox/gateway-releases/<source-SHA>/backend`: independent gateway releases;
  systemd `figfox-gateway.service.d/20-release.conf` selects the active release.
- `/opt/figfox/runtime/sam-assets`: unchanged local bridge and original sources.
- `/var/lib/figfox/sam3`: SAM weights/cache; `/var/lib/figfox/browser`: Chromium.
- `/var/lib/figfox/reconstruction`: persistent jobs, artifacts, receipts and limits.
- `/var/lib/figfox/kernel-cache/<kernel-directory>/sam-cache`: persistent SAM
  collection cache. The original kernel's `runs/sam-cache` is a symlink here;
  its source and the `runs` parent remain root-owned and read-only to the service.
- `/var/lib/figfox/backups`: migration snapshots; keep these private.
- `/var/lib/figfox/checks`: offline test/parity evidence.
- `/var/www/figfox-cloud`: built public frontend only.
- `/etc/figfox/{runtime,gateway,openai}.env`: private server configuration.
- `/etc/figfox/gateway-release.env`: gateway source path and exact Pages origins.
- `/etc/figfox/nginx.conf` and `/etc/figfox/http.d/`: private and public web routes.

`figfox-sam`, `figfox-reconstruction`, `figfox-gateway` and `figfox-web` are enabled
system services. Model/API secrets, account databases, uploads and backups must
never be copied into the web root or committed.

After installing a kernel release, run the following deployment step as root,
using that release's kernel path, before enabling reconstruction:

```bash
sudo python3 /opt/figfox/current/scripts/cloud/prepare-cache.py /opt/figfox/current/data/kernel/FigFox-21ffc01271904d6c5610f0f96afd84530968f11e
```

It preserves an existing matching link and refuses to replace an existing cache
directory or an unexpected link. Migrate any existing cache explicitly instead
of deleting it. `figfox-reconstruction.service` runs `check-runtime.py` as
`ExecStartPre`, under its actual filesystem restrictions. This checks cache and
task-state mkdir/fsync/atomic rename before the service accepts work. It makes no
SAM or model request.

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

Initial cloud release: 150 backend tests against an isolated test database; frozen
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

### Cache-path correction, 2026-11-06

The first two user-submitted cloud jobs failed before SAM or GPT with `Errno 30`:
the frozen native pipeline creates `PLUS_ROOT/runs/sam-cache`, which was initially
left in the read-only release tree. Both failures recorded zero known and
reserved cost. Model initialization and the original offline parity tests had
not exercised this deployment-specific write path; those checks did not establish
that live generation worked.

The correction maps only this cache to persistent state and adds the startup
check above. Under `User=figfox`, `ProtectSystem=strict`, `ProtectHome=true`,
`ReadWritePaths=/var/lib/figfox`, `NoNewPrivileges=true`, `PrivateTmp=true` and
`IPAddressDeny=any`, the new check failed before the mapping and passed after it.
Its optional `--render` check also passed the original Chromium measurement and
CairoSVG rendering functions using a synthetic rectangle. No user image, SAM
inference, GPT request or automatic retry was used for these checks. The original
pipeline and adapter sources, failed records and billing ledger are preserved.

For the Pages entry, build from `frontend/` with
`VITE_API_BASE_URL=https://34.143.155.158`, `VITE_INTERNAL_RECONSTRUCTION=true`,
`VITE_SESSION_TRANSPORT=bearer` and `npm run build:pages` for local
verification. Commit and push the reviewed source, install the matching
`deploy/pages-workflow.yml` in `QCYTSN/figfox`, then run
`node deploy/publish-pages.mjs <full-source-SHA>`. The workflow rebuilds that exact
source and records source SHA, API URL and session transport in `_release.json`. Historical
mirror frontend files and the portfolio's `site/figfox/` are not release inputs.
Build the optional cloud frontend with internal
reconstruction enabled and `VITE_API_BASE_URL=/`; never deploy local-kernel mode.

The deployment does not migrate browser-local unsaved drafts between origins.
Server-owned history and results are preserved. Save/export an existing local
editing document before changing its browser origin.

### Unified Pages workspace, 2026-11-06

The independent gateway release adds opt-in bearer session transport and leaves
the original worker running. Local verification passed 177 backend tests using
an isolated PostgreSQL database, the 12 research regression checks and a built
Pages browser fixture covering sign-in, refresh, two-account tab isolation,
revocation, authenticated PNG preview, SVG/PNG download bytes and SVG editor entry.
The fixture uses synthetic API responses only. The 477 frozen local files and
1,111 original cloud kernel files were verified unchanged.

Deploy the gateway before Pages. `deploy/install-gateway.sh REV ARCHIVE SHA256`
accepts a reviewed `git archive --format=tar.gz REV backend` and tests the release
using a clean environment, a separate reconstruction directory with no credential
file and the existing `figfox_cloud_test` database. Only the gateway is restarted;
the script verifies that the reconstruction worker PID is unchanged. The previous
gateway release and configuration remain available for rollback.
