import { createHash } from 'node:crypto';
import { remoteStatus } from './threads-remote.mjs';

const formats = ['Рилс', 'Карусель', 'Пост ТГ', 'Сторис', 'Threads'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function validateApproval(input, revision) {
  if (typeof revision !== 'string' || !/^[a-f0-9]{32}$/.test(revision)) fail('Сначала сохраните календарь.', 428);
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !formats.includes(input.format) || !['approve', 'unapprove'].includes(input.action)) fail('Проверьте дату и формат серии.');
}

// Approval and queue changes commit together. Lock order matches the publisher.
export async function approvePublicationDay(pool, userId, input, revision, env = process.env, now = new Date()) {
  validateApproval(input, revision);
  const isThreads = input.format === 'Threads';
  if (isThreads && input.action === 'approve') {
    if (env.THREADS_REMOTE_ENABLED !== '1' || env.THREADS_WORKER_USER_ID !== userId || !(await remoteStatus(pool, userId)).connected) fail('Издатель Threads сейчас не подключён. Попробуйте позже.', 503);
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    const queue = isThreads ? (await client.query('select * from cm_threads_queue where user_id=$1 order by publication_id,part_id for update', [userId])).rows : [];
    const saved = await client.query("select data,md5(data::text) as revision from cm_user_state where user_id=$1 and key='publications' for update", [userId]);
    if (saved.rows[0]?.revision !== revision) fail('Календарь обновился. Загрузите актуальную версию и проверьте серию ещё раз.', 409);
    const data = saved.rows[0].data;
    const items = data.items.filter(item => item.date === input.date && item.format === input.format);
    if (!items.length) fail('На этот день нет такой серии.');
    let approved = 0;
    for (const item of items) for (const part of item.parts) {
      const previous = queue.find(job => job.publication_id === item.id && job.part_id === part.id);
      if (previous?.status === 'published') { part.published = true; continue; }
      if (part.published) continue;
      if (['sending', 'uncertain'].includes(previous?.status)) fail('Один из постов уже отправляется или ожидает проверки. Сначала дождитесь результата публикации.', 409);
      if (input.action === 'approve') {
        if (!part.text?.trim()) fail('В серии есть пустой текст. Заполните его перед утверждением.');
        if (isThreads && Array.from(part.text).length > 500) fail('В одном из постов Threads больше 500 символов. Сократите его перед утверждением.');
        if (isThreads && (!part.scheduledAt || !Number.isFinite(Date.parse(part.scheduledAt)) || part.scheduledAt.slice(0, 10) !== item.date || Date.parse(part.scheduledAt) <= now.getTime())) fail('Укажите будущее время для каждого ещё не опубликованного поста. Время — по Калининграду.');
        if (isThreads) {
          const hash = createHash('sha256').update(`${part.text}\0${part.scheduledAt}`).digest('hex');
          await client.query(`insert into cm_threads_queue(user_id,publication_id,part_id,scheduled_at,content_hash,status)
            values($1,$2,$3,$4,$5,'ready') on conflict(user_id,publication_id,part_id) do update
            set scheduled_at=excluded.scheduled_at,content_hash=excluded.content_hash,status='ready',approved_at=now(),
            attempted_at=null,dispatch_id=null,container_id=null,remote_post_id=null,remote_url=null,published_at=null,error=null`,
          [userId, item.id, part.id, part.scheduledAt, hash]);
        }
        part.approvalStatus = 'approved'; approved++;
      } else {
        part.approvalStatus = 'draft';
        if (isThreads) await client.query("update cm_threads_queue set status='cancelled',error=null where user_id=$1 and publication_id=$2 and part_id=$3", [userId, item.id, part.id]);
      }
    }
    const result = await client.query("update cm_user_state set data=$2::jsonb,updated_at=now() where user_id=$1 and key='publications' returning data,md5(data::text) as revision", [userId, JSON.stringify(data)]);
    await client.query('commit');
    return { ...result.rows[0], approved, scheduled: isThreads && input.action === 'approve' };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}
