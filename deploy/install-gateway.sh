#!/usr/bin/env bash
# Run as root on the existing FigFox VM, with a reviewed git archive and SHA256.
set -euo pipefail
revision=${1:?source revision required}
archive=${2:?backend archive required}
checksum=${3:?archive checksum required}
mode=${4:-gateway}
[[ "$mode" = gateway || "$mode" = recovery ]]
[[ "$revision" =~ ^[0-9a-f]{40}$ && "$checksum" =~ ^[0-9a-f]{64}$ ]]
[[ $(id -u) = 0 ]]
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --status
release=/opt/figfox/gateway-releases/$revision
test ! -e "$release"
# The archive is produced by `git archive REV backend`, never from a working data directory.
tar -tzf "$archive" | awk '$0 !~ /^backend\// || $0 ~ /(^|\/)\.\.\// { bad=1 } END { exit bad }'
mkdir -p "$release"
tar --no-same-owner -xzf "$archive" -C "$release"
chown -R root:figfox "$release"
chmod -R u=rwX,g=rX,o= "$release"

sudo -u figfox bash -se -- "$release" <<'TEST'
set -a
. /etc/figfox/gateway.env
set +a
test_database="${AUTODRAFTMAN_DATABASE_URL/figfox_internal/figfox_cloud_test}"
[[ "$test_database" == */figfox_cloud_test ]]
cd "$1/backend"
test_state=$(mktemp -d /var/lib/figfox/checks/pages-state.XXXXXX)
# A clean environment excludes production secrets, origins and runtime/model settings.
env -i PATH=/opt/figfox/runtime/backend/bin:/usr/bin:/bin HOME=/var/lib/figfox \
  PYTHONPATH="$1/backend/src" AUTODRAFTMAN_DATABASE_URL="$test_database" \
  /opt/figfox/runtime/backend/bin/python -m alembic upgrade head
env -i PATH=/opt/figfox/runtime/backend/bin:/usr/bin:/bin HOME=/var/lib/figfox \
  PYTHONPATH="$1/backend/src" AUTODRAFTMAN_DATABASE_URL="$test_database" \
  FIGFOX_ACCESS_TEST_DATABASE_URL="$test_database" \
  FIGFOX_LOCAL_DATA="$test_state" FIGFOX_KERNEL_ENV="$test_state/no-credentials.env" \
  /opt/figfox/runtime/backend/bin/python -m pytest tests -q -p no:cacheprovider \
  --basetemp=/var/lib/figfox/checks/pages-pytest > /var/lib/figfox/checks/pages-backend-tests.txt 2>&1 \
  || { tail -n 60 /var/lib/figfox/checks/pages-backend-tests.txt; exit 1; }
tail -n 3 /var/lib/figfox/checks/pages-backend-tests.txt
TEST

backup=/var/lib/figfox/backups/gateway-$revision
mkdir -m 700 "$backup"
sudo -u postgres pg_dump --format=custom figfox_internal > "$backup/database.dump"
sudo -u figfox bash -se -- "$release" <<'MIGRATE'
set -a
. /etc/figfox/gateway.env
set +a
cd "$1/backend"
env -i PATH=/opt/figfox/runtime/backend/bin:/usr/bin:/bin HOME=/var/lib/figfox \
  PYTHONPATH="$1/backend/src" AUTODRAFTMAN_DATABASE_URL="$AUTODRAFTMAN_DATABASE_URL" \
  /opt/figfox/runtime/backend/bin/python -m alembic upgrade head
MIGRATE
dropin=/etc/systemd/system/figfox-gateway.service.d/20-release.conf
config=/etc/figfox/gateway-release.env
for file in "$dropin" "$config"; do
  if test -e "$file"; then cp -p "$file" "$backup/$(basename "$file")"; fi
done
worker=$(systemctl show figfox-reconstruction --property=MainPID --value)
worker_dropin=/etc/systemd/system/figfox-reconstruction.service.d/30-product-release.conf
worker_config=/etc/figfox/worker-release.env
worker_idle() {
  sudo -u figfox /opt/figfox/runtime/backend/bin/python - <<'IDLE'
import fcntl, json, sqlite3
from pathlib import Path
state = Path('/var/lib/figfox/reconstruction')
with (state / 'worker.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with sqlite3.connect(f'file:{state}/jobs.sqlite3?mode=ro', uri=True) as db:
        jobs = [json.loads(row[0]) for row in db.execute('SELECT snapshot FROM jobs')]
    assert not any(job['status'] in ('queued', 'running') for job in jobs), 'Active task: abort upgrade'
print('Worker idle; no tasks will be restarted.')
IDLE
}
if [[ "$mode" = recovery ]]; then
  for file in "$worker_dropin" "$worker_config"; do
    if test -e "$file"; then cp -p "$file" "$backup/$(basename "$file")"; fi
  done
  # Close admission before checking idle, so no user task can start in between.
  systemctl stop figfox-gateway
  if ! worker_idle; then
    systemctl start figfox-gateway
    exit 1
  fi
fi
rollback() {
  files=("$dropin" "$config")
  if [[ "$mode" = recovery ]]; then
    systemctl stop figfox-gateway
    # The new gateway may already have accepted a task before a health failure.
    # Preserve that running worker and its release instead of interrupting it.
    if ! worker_idle; then
      systemctl start figfox-gateway || true
      printf 'Rollback deferred: an active task must finish first. Current release retained.\n' >&2
      return 1
    fi
    files+=("$worker_dropin" "$worker_config")
  fi
  for file in "${files[@]}"; do
    if test -e "$backup/$(basename "$file")"; then cp -p "$backup/$(basename "$file")" "$file";
    else rm -f -- "$file"; fi
  done
  systemctl daemon-reload
  if [[ "$mode" = recovery ]]; then systemctl restart figfox-reconstruction; fi
  systemctl restart figfox-gateway
}
trap rollback ERR
if [[ "$mode" = recovery ]]; then
  systemctl stop figfox-reconstruction
  printf 'PYTHONPATH=%s/backend/src\nFIGFOX_ACCOUNT_BUDGETS_REQUIRED=1\nFIGFOX_ACCOUNT_SETTINGS=/etc/figfox/gateway.env\n' "$release" > "$worker_config"
  chown root:figfox "$worker_config"
  chmod 640 "$worker_config"
  mkdir -p "$(dirname "$worker_dropin")"
  printf '[Service]\nWorkingDirectory=%s\nEnvironmentFile=%s\n' "$release" "$worker_config" > "$worker_dropin"
fi
printf 'PYTHONPATH=%s/backend/src\nAUTODRAFTMAN_CORS_ORIGINS=https://34.143.155.158,https://qcytsn.github.io\nAUTODRAFTMAN_BEARER_ORIGINS=https://qcytsn.github.io\n' "$release" > "$config"
chown root:figfox "$config"
chmod 640 "$config"
mkdir -p "$(dirname "$dropin")"
printf '[Service]\nWorkingDirectory=%s/backend\nEnvironmentFile=%s\n' "$release" "$config" > "$dropin"
systemctl daemon-reload
if [[ "$mode" = recovery ]]; then
  systemctl start figfox-reconstruction
  for attempt in {1..20}; do
    if curl -fsS http://127.0.0.1:8787/openapi.json > /dev/null; then break; fi
    sleep 1
  done
  curl -fsS http://127.0.0.1:8787/openapi.json | /opt/figfox/runtime/backend/bin/python -c 'import json,sys; assert "/local-api/jobs/{job_id}/recovery" in json.load(sys.stdin)["paths"]'
fi
systemctl restart figfox-gateway
for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:8788/api/v1/auth/providers > /dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:8788/api/v1/auth/providers > /dev/null
if [[ "$mode" = gateway ]]; then
  test "$worker" = "$(systemctl show figfox-reconstruction --property=MainPID --value)"
fi
trap - ERR
printf 'Product release %s active (%s); frozen kernel and task data retained.\n' "$revision" "$mode"
