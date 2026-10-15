#!/usr/bin/env bash
set -euo pipefail
exec 9>"${KARTA_DEPLOY_LOCK:-/var/lock/kartakontenta-maintenance.lock}"
flock 9
SOURCE=${KARTA_DEPLOY_SOURCE:-/opt/flow-forge-068}
BASE=${KARTA_DEPLOY_BASE:-/opt/kartakontenta}
export GIT_TERMINAL_PROMPT=0
PREVIOUS=""
SWITCHED=0
rollback() {
 local status=$?
 trap - ERR
 if test "$SWITCHED" -eq 1 && test -n "$PREVIOUS"; then
  ln -sfn "$PREVIOUS" "$BASE/current.rollback"
  mv -Tf "$BASE/current.rollback" "$BASE/current"
  if ! systemctl restart kartakontenta; then echo 'Karta rollback restart failed' >&2; fi
 fi
 exit "$status"
}
trap rollback ERR
cd "$SOURCE"
git fetch origin main
SHA=$(git rev-parse origin/main)
test "${#SHA}" -eq 40
if test -f "$BASE/current/release.json" && grep -q "$SHA" "$BASE/current/release.json"; then exit 0; fi
RELEASE="$BASE/releases/$SHA"
install -d -m 755 "$RELEASE"
git archive "$SHA" | tar -x -C "$RELEASE"
ln -sfn /etc/kartakontenta/runtime.env "$RELEASE/.env.local"
cd "$RELEASE"
npm ci --include=dev
npm audit --omit=dev --audit-level=moderate
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
node --check server/telegram-auth-server.mjs
node --test server/security.test.mjs server/agent-workspace.test.mjs server/karta-mcp.test.mjs server/admin-overview.test.mjs ops/runtime-access.test.mjs ops/operations.test.mjs
node ops/prepare-runtime.mjs check
if test -L "$BASE/current"; then node "$BASE/current/ops/backup.mjs" create; fi
node ops/migrate.mjs
node ops/prepare-runtime.mjs
chown root:karta /etc/kartakontenta /etc/kartakontenta/runtime.env
chmod 750 /etc/kartakontenta
chmod 640 /etc/kartakontenta/runtime.env
printf '{"commit":"%s"}\n' "$SHA" > "$RELEASE/release.json"
PREVIOUS=$(readlink -f "$BASE/current" || true)
ln -sfn "$RELEASE" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
SWITCHED=1
systemctl restart kartakontenta
HEALTHY=0
for attempt in $(seq 1 15); do
 if curl -fsS --connect-timeout 2 --max-time 4 http://127.0.0.1:3001/api/health >/dev/null; then HEALTHY=1; break; fi
 sleep 1
done
if test "$HEALTHY" -ne 1; then
 false # ERR trap also handles restart failure, not only failed HTTP readiness.
fi
ln -sfn "$BASE/current" "$BASE/tools"
SWITCHED=0
trap - ERR
echo "Karta Kontenta deployed: $SHA"
