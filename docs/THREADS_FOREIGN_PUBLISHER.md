# Foreign Threads publisher

The content map database owns the calendar, approval and publishing queue. A separate Node.js worker runs on the foreign VPS and calls Meta. It reads `THREADS_ACCESS_TOKEN` from Lina's existing environment; the Meta token is never sent to the content map.

## Protected bridge

Requests use an independent random `THREADS_WORKER_SECRET` and are scoped to `THREADS_WORKER_USER_ID`. `THREADS_WORKER_USERNAME` defines the expected Threads profile. The bridge supports authenticated health, profile heartbeat, claim and result requests under `/api/internal/threads/`. Disabled or missing configuration denies writes/claims. No bridge action approves drafts.

Set `THREADS_REMOTE_ENABLED=1` only after checking that the existing queue contains no approved or in-flight jobs. Keep `THREADS_AUTOPUBLISH_ENABLED=0` on the application server. Local publishing is disabled while remote publishing is configured. Every approved job is checked against its text/time hash when claimed.

## Worker

Install `server/threads-publisher.mjs` as `/opt/lina-threads-publisher/threads-publisher.mjs` and `server/lina-threads-publisher.service` as a systemd service. It runs as `polina-bot`, reads the existing Lina environment and its own `/etc/lina-threads-publisher/env`, and writes an atomic journal under `/var/lib/lina-threads-publisher`.

Worker environment: `CONTENT_MAP_URL`, `THREADS_WORKER_SECRET`, `THREADS_NOTIFY_CHAT_ID`, and optionally `THREADS_PUBLISHER_STATE_DIR`. The notification recipient must be included in Lina's `TELEGRAM_ALLOWED_CHAT_IDS`. The worker sends confirmed publication notifications through Lina's bot.

`THREADS_PUBLISHER_DRY_RUN=1` checks the authenticated Meta profile and bridge, reports the queue summary, and exits without claiming or publishing any post. A regular worker checks the profile every minute and polls the bridge every 20 seconds.

The journal checkpoints the container and publication request. On restart, an unfinished publication is marked uncertain for manual reconciliation. It is never blindly published a second time. Confirmed publication IDs survive bridge outages; completion is retried idempotently. A failed notification remains in the journal for retry. Telegram notification delivery may repeat if its acknowledgement is lost, but does not repeat the Threads publication.

## Verification

- `node --test server/threads-remote.test.mjs src/test/publications.node-test.mjs`
- `node --check server/telegram-auth-server.mjs`
- `npm run lint` and `npm run build`
- `node server/threads-remote.dbtest.mjs` with database environment: all writes use session-local temporary tables, never real user records.

Real publication requires the owner's approval of specific reviewed content and future schedule. Infrastructure deployment does not approve existing drafts. A working profile/heartbeat is not proof of end-to-end live publishing; verify the first approved post, remote ID, calendar flag and notification separately.

## Rollback

Stop `lina-threads-publisher`, set `THREADS_REMOTE_ENABLED=0`, and restart the application. Keep journal files and publication records for reconciliation. Environment changes are backed up in protected directories by `threads-deploy-config.mjs`. Apply additive schema changes; do not delete user data for rollback.
