import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const hash = part => createHash('sha256').update(`${part.text}\0${part.scheduledAt}`).digest('hex');
const equal = (a, b) => {
  const aa = createHash('sha256').update(String(a)).digest();
  const bb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(aa, bb);
};

export function remoteAuthorized(authorization, secret) {
  return Boolean(secret && secret.length >= 32 && authorization?.startsWith('Bearer ') && equal(authorization.slice(7), secret));
}

export async function ensureRemoteSchema(pool) {
  await pool.query(`
    create table if not exists cm_threads_workers (
      user_id text primary key, username text not null, threads_user_id text not null,
      healthy boolean not null default false, last_seen timestamptz not null default now()
    );
    alter table cm_threads_queue add column if not exists dispatch_id text;
    alter table cm_threads_queue add column if not exists remote_url text;
    alter table cm_threads_queue add column if not exists published_at timestamptz;
  `);
}

export async function remoteStatus(pool, userId) {
  const worker = await pool.query('select username,healthy,last_seen from cm_threads_workers where user_id=$1', [userId]);
  const row = worker.rows[0];
  return { available: true, connected: Boolean(row?.healthy && Date.now() - new Date(row.last_seen).getTime() < 180000),
    username: row?.username || null, publisher: 'foreign', lastSeen: row?.last_seen || null };
}

export async function heartbeat(pool, userId, input, expectedUsername) {
  if (input.username !== expectedUsername || !/^\d+$/.test(String(input.profileId))) throw new Error('profile_mismatch');
  await pool.query(`insert into cm_threads_workers(user_id,username,threads_user_id,healthy,last_seen)
    values($1,$2,$3,$4,now()) on conflict(user_id) do update set username=excluded.username,
    threads_user_id=excluded.threads_user_id,healthy=excluded.healthy,last_seen=now()`,
  [userId, input.username, String(input.profileId), input.healthy === true]);
  return { ok: true };
}

// Called only by the foreign worker. Calendar and queue stay in the original database.
export async function claimRemoteJob(pool, userId) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`update cm_threads_queue set status='uncertain',error='Publisher interrupted; check Threads before retry'
      where user_id=$1 and status='sending' and attempted_at < now()-interval '10 minutes'`, [userId]);
    await client.query(`update cm_threads_queue set status='missed' where user_id=$1 and status='ready'
      and scheduled_at < now()-interval '15 minutes'`, [userId]);
    const result = await client.query(`select * from cm_threads_queue where user_id=$1 and status='ready'
      and scheduled_at <= now() and scheduled_at >= now()-interval '15 minutes'
      order by scheduled_at for update skip locked limit 1`, [userId]);
    const job = result.rows[0];
    if (!job) { await client.query('commit'); return null; }
    const calendar = await client.query("select data from cm_user_state where user_id=$1 and key='publications' for update", [userId]);
    const item = calendar.rows[0]?.data?.items?.find(x => x.id === job.publication_id);
    const part = item?.parts?.find(x => x.id === job.part_id);
    if (!part || part.published || part.approvalStatus !== 'approved' || hash(part) !== job.content_hash) {
      await client.query("update cm_threads_queue set status='stale',error='Calendar changed after approval' where user_id=$1 and publication_id=$2 and part_id=$3", [userId, job.publication_id, job.part_id]);
      await client.query('commit'); return null;
    }
    const dispatchId = randomUUID();
    await client.query(`update cm_threads_queue set status='sending',dispatch_id=$4,attempted_at=now()
      where user_id=$1 and publication_id=$2 and part_id=$3`, [userId, job.publication_id, job.part_id, dispatchId]);
    await client.query('commit');
    return { dispatchId, publicationId: job.publication_id, partId: job.part_id, text: part.text,
      scheduledAt: part.scheduledAt, title: item.title };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}

export async function recordRemoteResult(pool, userId, input) {
  if (typeof input.dispatchId !== 'string' || !['container', 'published', 'uncertain'].includes(input.status)) throw new Error('invalid_result');
  if (input.status === 'published' && !/^\d+$/.test(String(input.remoteId))) throw new Error('invalid_remote_id');
  if (input.status === 'container' && !/^\d+$/.test(String(input.containerId))) throw new Error('invalid_container_id');
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await client.query('select * from cm_threads_queue where user_id=$1 and dispatch_id=$2 for update', [userId, input.dispatchId]);
    const job = result.rows[0];
    if (!job) throw new Error('dispatch_not_found');
    if (job.status === 'published') {
      if (input.status !== 'published' || String(input.remoteId) !== job.remote_post_id) throw new Error('result_conflict');
      await client.query('commit'); return { ok: true, status: 'published' };
    }
    if (!['sending', 'uncertain'].includes(job.status)) throw new Error('dispatch_not_active');
    if (input.status === 'container') {
      await client.query('update cm_threads_queue set container_id=$3 where user_id=$1 and dispatch_id=$2', [userId, input.dispatchId, String(input.containerId)]);
    } else if (input.status === 'uncertain') {
      await client.query("update cm_threads_queue set status='uncertain',error=$3 where user_id=$1 and dispatch_id=$2", [userId, input.dispatchId, 'Publication not confirmed; check Threads before retry']);
    } else {
      let permalink = null;
      if (input.permalink) {
        const url = new URL(input.permalink);
        if (url.protocol !== 'https:' || !['www.threads.net','threads.net','www.threads.com','threads.com'].includes(url.hostname)) throw new Error('invalid_permalink');
        permalink = url.toString();
      }
      const calendar = await client.query("select data from cm_user_state where user_id=$1 and key='publications' for update", [userId]);
      const data = calendar.rows[0]?.data;
      const part = data?.items?.find(x => x.id === job.publication_id)?.parts?.find(x => x.id === job.part_id);
      if (part && hash(part) === job.content_hash) {
        part.published = true;
        await client.query("update cm_user_state set data=$2::jsonb,updated_at=now() where user_id=$1 and key='publications'", [userId, JSON.stringify(data)]);
      }
      await client.query(`update cm_threads_queue set status='published',remote_post_id=$3,remote_url=$4,
        published_at=now(),error=null where user_id=$1 and dispatch_id=$2`, [userId, input.dispatchId, String(input.remoteId), permalink]);
    }
    await client.query('commit');
    return { ok: true, status: input.status };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}

export async function handleRemoteRequest({ req, res, path, pool, body, send, env }) {
  if (!remoteAuthorized(req.headers.authorization, env.THREADS_WORKER_SECRET) || !env.THREADS_WORKER_USER_ID) return send(res, 401, { error: 'unauthorized' });
  const userId = env.THREADS_WORKER_USER_ID;
  if (path === '/api/internal/threads/health' && req.method === 'GET') {
    const queue = await pool.query('select status,count(*)::int as count from cm_threads_queue where user_id=$1 group by status', [userId]);
    return send(res, 200, { ok: true, publisher: 'foreign', queue: queue.rows });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (path === '/api/internal/threads/heartbeat') return send(res, 200, await heartbeat(pool, userId, await body(req), env.THREADS_WORKER_USERNAME));
  if (path === '/api/internal/threads/claim') {
    if (env.THREADS_REMOTE_ENABLED !== '1') return send(res, 200, { job: null });
    return send(res, 200, { job: await claimRemoteJob(pool, userId) });
  }
  if (path === '/api/internal/threads/result') return send(res, 200, await recordRemoteResult(pool, userId, await body(req)));
  return send(res, 404, { error: 'not_found' });
}
