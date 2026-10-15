// Run on the application host. Temporary verification sessions are always deleted.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readEnv, databasePool, fingerprint } from './db-config.mjs';
import { issueSession } from '../server/session-store.mjs';
import { readAdminOverview } from '../server/admin-overview.mjs';
const env = readEnv(process.env.KARTA_ENV_FILE || '/etc/kartakontenta/runtime.env');
const pool = databasePool(env);
const ids = String(env.ADMIN_TELEGRAM_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
const origin = process.env.KARTA_CHECK_ORIGIN || 'http://127.0.0.1:3001';
const cookie = env.APP_URL.startsWith('https:') ? '__Host-contentmap_session' : 'contentmap_session';
const sessions = [];
try {
  const before = await fingerprint(pool);
  const overview = await readAdminOverview(pool, { days: 30, telegramMode: env.TELEGRAM_UPDATES_MODE });
  assert.ok(overview.totals.users >= 0); assert.equal(overview.system.database, 'ok');
  if (process.argv.includes('--http')) {
    for (const endpoint of ['/api/admin/overview', '/api/admin/users']) assert.equal((await fetch(origin + endpoint)).status, 401);
    const { rows } = await pool.query('select "userId" as id,"telegramId" as telegram_id from telegram_accounts');
    for (const admin of [true, false]) {
      const account = rows.find(r => ids.includes(r.telegram_id) === admin);
      if (!account) { if (admin) throw Error('No configured administrator account'); continue; }
      const token = await issueSession(pool, account.id, env.SESSION_SECRET);
      const hash = createHash('sha256').update(token).digest('hex'); sessions.push(hash);
      const headers = { Cookie: cookie + '=' + token };
      const response = await fetch(origin + '/api/admin/overview?days=7', { headers });
      assert.equal(response.status, admin ? 200 : 403);
      const result = await response.json();
      if (admin) {
        assert.equal(result.period.days, 7); assert.equal(result.totals.users, overview.totals.users);
        assert.equal(result.totals.contentItems, overview.totals.contentItems);
        const me = await (await fetch(origin + '/api/auth/me', { headers })).json(); assert.equal(me.user.isAdmin, true);
        await pool.query("update cm_auth_sessions set admin_seen_at=now()-interval '6 minutes' where token_hash=$1", [hash]);
        const expired = await fetch(origin + '/api/admin/overview', { headers }); assert.equal(expired.status, 401);
        assert.equal((await expired.json()).error, 'admin_reauthentication_required');
      } else assert.equal(result.error, 'forbidden');
    }
  }
  const after = await fingerprint(pool); assert.deepEqual(after, before);
  console.log(JSON.stringify({ ok: true, state: after, totals: overview.totals, connectedAgents: overview.agents.connected, queue: overview.publishing.queue, checks: process.argv.includes('--http') ? 'database,anonymous,admin,ordinary,expiry,preservation' : 'database,preservation' }));
} finally {
  if (sessions.length) await pool.query('delete from cm_auth_sessions where token_hash=any($1)', [sessions]);
  await pool.end();
}
