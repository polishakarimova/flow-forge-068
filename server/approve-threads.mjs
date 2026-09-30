// Operator action after the owner explicitly approves the reviewed calendar.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import pg from 'pg';
import { approveThreads, ensureThreadsSchema, threadsStatus } from './threads-autopost.mjs';
import { remoteStatus } from './threads-remote.mjs';

const args = process.argv.slice(2);
const option = key => { const index = args.indexOf(key); return index < 0 ? undefined : args[index + 1]; };
const userId = option('--user');
const username = option('--expect-username');
const ids = (option('--publication-ids') || '').split(',').filter(Boolean);
const backup = option('--backup');
const apply = args.includes('--apply');
if (!userId || !username || !ids.length || (apply && (!backup || !isAbsolute(backup)))) {
  throw new Error('Usage: node server/approve-threads.mjs --user ID --expect-username USERNAME --publication-ids ID,ID [--apply --backup ABSOLUTE_NEW_FILE]');
}
for (const filename of ['.env.local', '.env']) {
  if (!existsSync(filename)) continue;
  for (const line of readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const text = line.trim(); if (!text || text.startsWith('#') || !text.includes('=')) continue;
    const i = text.indexOf('='); const key = text.slice(0, i).trim().replace(/^\uFEFF/, '');
    let value = text.slice(i + 1).trim(); if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
const url = new URL(process.env.DATABASE_URL);
const mode = url.searchParams.get('sslmode'); url.searchParams.delete('sslmode');
const cert = process.env.PGSSLROOTCERT;
const ssl = mode && mode !== 'disable' ? cert && existsSync(cert) ? { ca: readFileSync(cert, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false } : false;
const pool = new pg.Pool({ connectionString: url.toString(), ssl });
try {
  await ensureThreadsSchema(pool);
  const account = await pool.query('select username from telegram_accounts where "userId"=$1', [userId]);
  if (account.rows[0]?.username?.toLowerCase() !== username.toLowerCase()) throw new Error('Telegram account mismatch');
  const current = await pool.query("select data from cm_user_state where user_id=$1 and key='publications'", [userId]);
  const selected = ids.map(id => current.rows[0]?.data?.items?.find(item => item.id === id));
  if (selected.some(item => !item || item.format !== 'Threads')) throw new Error('A selected Threads series is missing');
  const summary = { mode: apply ? 'apply' : 'dry-run', account: username, series: selected.length,
    posts: selected.reduce((sum, item) => sum + item.parts.length, 0),
    future: selected.flatMap(item => item.parts).filter(part => new Date(part.scheduledAt) > new Date()).length };
  if (apply) {
    const remote = process.env.THREADS_REMOTE_ENABLED === '1' && process.env.THREADS_WORKER_USER_ID === userId;
    const status = remote ? await remoteStatus(pool, userId) : await threadsStatus(pool, userId, Boolean(process.env.THREADS_APP_ID && process.env.THREADS_APP_SECRET));
    if (!status.connected || (!remote && process.env.THREADS_AUTOPUBLISH_ENABLED !== '1')) throw new Error('Threads connection and enabled scheduler are required before approval');
    writeFileSync(backup, JSON.stringify({ savedAt: new Date().toISOString(), data: current.rows[0].data }, null, 2), { flag: 'wx', mode: 0o600 });
    Object.assign(summary, await approveThreads(pool, userId, username, ids));
  }
  console.log(JSON.stringify(summary));
} finally { await pool.end(); }
