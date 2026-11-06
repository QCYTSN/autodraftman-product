#!/usr/bin/env bash
# Run as root on the existing FigFox VM, with a reviewed git archive and SHA256.
set -euo pipefail
revision=${1:?source revision required}
archive=${2:?backend archive required}
checksum=${3:?archive checksum required}
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
  FIGFOX_ACCESS_TEST_DATABASE_URL="$test_database" \
  FIGFOX_LOCAL_DATA="$test_state" FIGFOX_KERNEL_ENV="$test_state/no-credentials.env" \
  /opt/figfox/runtime/backend/bin/python -m pytest tests -q -p no:cacheprovider \
  --basetemp=/var/lib/figfox/checks/pages-pytest > /var/lib/figfox/checks/pages-backend-tests.txt 2>&1 \
  || { tail -n 60 /var/lib/figfox/checks/pages-backend-tests.txt; exit 1; }
tail -n 3 /var/lib/figfox/checks/pages-backend-tests.txt
TEST

backup=/var/lib/figfox/backups/gateway-$revision
mkdir -m 700 "$backup"
dropin=/etc/systemd/system/figfox-gateway.service.d/20-release.conf
config=/etc/figfox/gateway-release.env
for file in "$dropin" "$config"; do
  if test -e "$file"; then cp -p "$file" "$backup/$(basename "$file")"; fi
done
worker=$(systemctl show figfox-reconstruction --property=MainPID --value)
rollback() {
  for file in "$dropin" "$config"; do
    if test -e "$backup/$(basename "$file")"; then cp -p "$backup/$(basename "$file")" "$file";
    else rm -f -- "$file"; fi
  done
  systemctl daemon-reload
  systemctl restart figfox-gateway
}
trap rollback ERR
printf 'PYTHONPATH=%s/backend/src\nAUTODRAFTMAN_CORS_ORIGINS=https://34.143.155.158,https://qcytsn.github.io\nAUTODRAFTMAN_BEARER_ORIGINS=https://qcytsn.github.io\n' "$release" > "$config"
chown root:figfox "$config"
chmod 640 "$config"
mkdir -p "$(dirname "$dropin")"
printf '[Service]\nWorkingDirectory=%s/backend\nEnvironmentFile=%s\n' "$release" "$config" > "$dropin"
systemctl daemon-reload
systemctl restart figfox-gateway
for attempt in {1..20}; do
  if curl -fsS http://127.0.0.1:8788/api/v1/auth/providers > /dev/null; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:8788/api/v1/auth/providers > /dev/null
test "$worker" = "$(systemctl show figfox-reconstruction --property=MainPID --value)"
trap - ERR
printf 'Gateway release %s active; reconstruction worker %s unchanged.\n' "$revision" "$worker"
