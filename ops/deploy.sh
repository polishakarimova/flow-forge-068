#!/usr/bin/env bash
set -euo pipefail
exec 9>/var/lock/kartakontenta-maintenance.lock
flock 9
SOURCE=/opt/flow-forge-068
BASE=/opt/kartakontenta
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
npm run build
node --check server/telegram-auth-server.mjs
node --test server/security.test.mjs server/agent-workspace.test.mjs server/karta-mcp.test.mjs
if test -L "$BASE/current"; then node "$BASE/current/ops/backup.mjs" create; fi
node ops/migrate.mjs
node ops/prepare-runtime.mjs
chown root:karta /etc/kartakontenta /etc/kartakontenta/runtime.env
chmod 750 /etc/kartakontenta
chmod 640 /etc/kartakontenta/runtime.env
printf '{"commit":"%s"}\n' "$SHA" > "$RELEASE/release.json"
PREVIOUS=$(readlink -f "$BASE/current" || true)
ln -s "$RELEASE" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
systemctl restart kartakontenta
HEALTHY=0
for attempt in $(seq 1 15); do
 if curl -fsS http://127.0.0.1:3001/api/health >/dev/null; then HEALTHY=1; break; fi
 sleep 1
done
if test "$HEALTHY" -ne 1; then
 if test -n "$PREVIOUS"; then ln -s "$PREVIOUS" "$BASE/current.rollback"; mv -Tf "$BASE/current.rollback" "$BASE/current"; systemctl restart kartakontenta; fi
 exit 1
fi
ln -sfn "$BASE/current" "$BASE/tools"
echo "Karta Kontenta deployed: $SHA"
