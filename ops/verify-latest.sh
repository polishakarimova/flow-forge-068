#!/usr/bin/env bash
set -euo pipefail
FILE=$(find /opt/kartakontenta-backups/encrypted -maxdepth 1 -type f -name 'karta-*.aes' | sort | tail -1)
test -n "$FILE"
exec node /opt/kartakontenta/tools/ops/backup.mjs verify "$FILE"
