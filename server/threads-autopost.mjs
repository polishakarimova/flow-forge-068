import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const graph = 'https://graph.threads.net';
const hash = value => createHash('sha256').update(value).digest('hex');
const contentHash = (text, scheduledAt) => hash(`${text}\0${scheduledAt}`);

export async function ensureThreadsSchema(pool) {
  await pool.query(`
    create table if not exists cm_threads_oauth_states (
      state text primary key, user_id text not null, expires_at timestamptz not null
    );
    create table if not exists cm_threads_connections (
      user_id text primary key, threads_user_id text not null, username text,
      encrypted_token text not null, expires_at timestamptz,
      updated_at timestamptz not null default now()
    );
    create table if not exists cm_threads_queue (
      user_id text not null, publication_id text not null, part_id text not null,
      scheduled_at timestamptz not null, content_hash text not null,
      status text not null, approved_at timestamptz not null default now(),
      attempted_at timestamptz, container_id text, remote_post_id text, error text,
      primary key (user_id, publication_id, part_id)
    );
    create index if not exists cm_threads_queue_due on cm_threads_queue(status, scheduled_at);
  `);
}

function secretKey(secret) {
  if (!secret) throw new Error('THREADS_TOKEN_SECRET or SESSION_SECRET is required');
  return createHash('sha256').update(`threads-token:${secret}`).digest();
}

function seal(token, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(x => x.toString('base64url')).join('.');
}

function unseal(value, secret) {
  const [iv, tag, encrypted] = value.split('.').map(x => Buffer.from(x, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', secretKey(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function metaJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) throw new Error(`Threads API ${response.status}: ${body.error?.message || 'request failed'}`);
  return body;
}

export async function beginThreadsConnect(pool, userId, appId, appUrl) {
  const state = randomBytes(24).toString('base64url');
  await pool.query('insert into cm_threads_oauth_states(state,user_id,expires_at) values($1,$2,now()+interval \'10 minutes\')', [state, userId]);
  const url = new URL('https://threads.net/oauth/authorize');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', `${appUrl}/api/threads/callback`);
  url.searchParams.set('scope', 'threads_basic,threads_content_publish');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return url.toString();
}

export async function finishThreadsConnect(pool, state, code, { appId, appSecret, appUrl, tokenSecret }) {
  const saved = await pool.query('delete from cm_threads_oauth_states where state=$1 and expires_at>now() returning user_id', [state]);
  if (saved.rowCount !== 1) throw new Error('Threads authorization expired');
  const redirectUri = `${appUrl}/api/threads/callback`;
  const short = await metaJson(`${graph}/oauth/access_token`, {
    method: 'POST',
    body: new URLSearchParams({ client_id: appId, client_secret: appSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  });
  const longUrl = new URL(`${graph}/access_token`);
  longUrl.searchParams.set('grant_type', 'th_exchange_token');
  longUrl.searchParams.set('client_secret', appSecret);
  longUrl.searchParams.set('access_token', short.access_token);
  const long = await metaJson(longUrl);
  const token = long.access_token || short.access_token;
  const profile = await metaJson(`${graph}/v1.0/me?fields=id,username&access_token=${encodeURIComponent(token)}`);
  if (!profile.id || !token) throw new Error('Threads account could not be verified');
  const expiry = long.expires_in ? new Date(Date.now() + Number(long.expires_in) * 1000) : null;
  await pool.query(`insert into cm_threads_connections(user_id,threads_user_id,username,encrypted_token,expires_at)
    values($1,$2,$3,$4,$5) on conflict(user_id) do update set threads_user_id=excluded.threads_user_id,
    username=excluded.username, encrypted_token=excluded.encrypted_token, expires_at=excluded.expires_at, updated_at=now()`,
  [saved.rows[0].user_id, String(profile.id), profile.username || null, seal(token, tokenSecret), expiry]);
  return { username: profile.username || null, userId: saved.rows[0].user_id };
}

export async function threadsStatus(pool, userId, configured) {
  const connection = await pool.query('select username,expires_at from cm_threads_connections where user_id=$1', [userId]);
  const queue = await pool.query('select publication_id,part_id,status,scheduled_at,remote_post_id,remote_url,error from cm_threads_queue where user_id=$1', [userId]);
  return { available: configured, connected: connection.rowCount === 1, username: connection.rows[0]?.username || null,
    expiresAt: connection.rows[0]?.expires_at || null, queue: queue.rows };
}

export async function approveThreads(pool, userId, username, publicationIds, now = new Date()) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const account = await client.query('select username from telegram_accounts where "userId"=$1', [userId]);
    if (account.rows[0]?.username?.toLowerCase() !== username.toLowerCase()) throw new Error('Telegram account mismatch');
    const state = await client.query("select data from cm_user_state where user_id=$1 and key='publications' for update", [userId]);
    const data = state.rows[0]?.data;
    if (!data) throw new Error('Calendar not found');
    let approved = 0; let missed = 0;
    for (const id of publicationIds) {
      const item = data.items.find(x => x.id === id);
      if (!item || item.format !== 'Threads') throw new Error(`Threads series missing: ${id}`);
      for (const part of item.parts) {
        if (!part.scheduledAt || !part.text.trim() || part.published) throw new Error(`Post is incomplete: ${part.id}`);
        const schedule = new Date(part.scheduledAt);
        const status = schedule > now ? 'ready' : 'missed';
        if (status === 'ready') approved++; else missed++;
        const previous = await client.query('select status from cm_threads_queue where user_id=$1 and publication_id=$2 and part_id=$3', [userId, id, part.id]);
        if (previous.rowCount && ['sending', 'published', 'uncertain'].includes(previous.rows[0].status)) throw new Error(`Post already sent or being sent: ${part.id}`);
        await client.query(`insert into cm_threads_queue(user_id,publication_id,part_id,scheduled_at,content_hash,status)
          values($1,$2,$3,$4,$5,$6) on conflict(user_id,publication_id,part_id) do update
          set scheduled_at=excluded.scheduled_at,content_hash=excluded.content_hash,status=excluded.status,approved_at=now(),error=null`,
        [userId, id, part.id, schedule, contentHash(part.text, part.scheduledAt), status]);
        part.approvalStatus = status === 'ready' ? 'approved' : 'draft';
      }
    }
    await client.query("update cm_user_state set data=$2::jsonb,updated_at=now() where user_id=$1 and key='publications'", [userId, JSON.stringify(data)]);
    await client.query('commit');
    return { approved, missed };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}

export async function runThreadsScheduler(pool, tokenSecret, current = new Date()) {
  await pool.query("update cm_threads_queue set status='missed' where status='ready' and scheduled_at < $1::timestamptz - interval '15 minutes'", [current]);
  const claim = await pool.query(`update cm_threads_queue q set status='sending',attempted_at=now()
    where (q.user_id,q.publication_id,q.part_id) = (
      select user_id,publication_id,part_id from cm_threads_queue
      where status='ready' and scheduled_at <= $1 and scheduled_at >= $1::timestamptz - interval '15 minutes'
      order by scheduled_at for update skip locked limit 1)
    returning q.*`, [current]);
  if (!claim.rowCount) return null;
  const job = claim.rows[0];
  try {
    const calendar = await pool.query("select data from cm_user_state where user_id=$1 and key='publications'", [job.user_id]);
    const item = calendar.rows[0]?.data?.items?.find(x => x.id === job.publication_id);
    const part = item?.parts?.find(x => x.id === job.part_id);
    if (!part || part.published || part.approvalStatus !== 'approved' || contentHash(part.text, part.scheduledAt) !== job.content_hash) {
      await pool.query("update cm_threads_queue set status='stale',error='Calendar text or time changed after approval' where user_id=$1 and publication_id=$2 and part_id=$3", [job.user_id, job.publication_id, job.part_id]);
      return { status: 'stale', partId: job.part_id };
    }
    const connection = await pool.query('select encrypted_token,expires_at from cm_threads_connections where user_id=$1', [job.user_id]);
    if (!connection.rowCount || (connection.rows[0].expires_at && connection.rows[0].expires_at <= current)) {
      await pool.query("update cm_threads_queue set status='blocked',error='Threads account not connected or token expired' where user_id=$1 and publication_id=$2 and part_id=$3", [job.user_id, job.publication_id, job.part_id]);
      return { status: 'blocked', partId: job.part_id };
    }
    const token = unseal(connection.rows[0].encrypted_token, tokenSecret);
    const container = await metaJson(`${graph}/v1.0/me/threads`, { method: 'POST',
      body: new URLSearchParams({ media_type: 'TEXT', text: part.text, access_token: token }) });
    if (!container.id) throw new Error('Threads container ID missing');
    await pool.query('update cm_threads_queue set container_id=$4 where user_id=$1 and publication_id=$2 and part_id=$3', [job.user_id, job.publication_id, job.part_id, String(container.id)]);
    const published = await metaJson(`${graph}/v1.0/me/threads_publish`, { method: 'POST',
      body: new URLSearchParams({ creation_id: String(container.id), access_token: token }) });
    if (!published.id) throw new Error('Threads post ID missing');
    await pool.query("update cm_threads_queue set status='published',remote_post_id=$4,error=null where user_id=$1 and publication_id=$2 and part_id=$3", [job.user_id, job.publication_id, job.part_id, String(published.id)]);
    const client = await pool.connect();
    try { await client.query('begin');
      const latest = await client.query("select data from cm_user_state where user_id=$1 and key='publications' for update", [job.user_id]);
      const output = latest.rows[0]?.data; const latestPart = output?.items?.find(x => x.id === job.publication_id)?.parts?.find(x => x.id === job.part_id);
      if (latestPart && contentHash(latestPart.text, latestPart.scheduledAt) === job.content_hash) {
        latestPart.published = true;
        await client.query("update cm_user_state set data=$2::jsonb,updated_at=now() where user_id=$1 and key='publications'", [job.user_id, JSON.stringify(output)]);
      }
      await client.query('commit');
    } catch (error) { await client.query('rollback'); throw error; } finally { client.release(); }
    return { status: 'published', partId: job.part_id, remoteId: published.id };
  } catch (error) {
    await pool.query("update cm_threads_queue set status='uncertain',error=$4 where user_id=$1 and publication_id=$2 and part_id=$3 and status='sending'", [job.user_id, job.publication_id, job.part_id, String(error.message).slice(0, 300)]);
    return { status: 'uncertain', partId: job.part_id };
  }
}
