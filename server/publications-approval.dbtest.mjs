// Uses session-local tables only; does not publish or modify real calendars.
import assert from 'node:assert/strict';
import pg from 'pg';
import { existsSync, readFileSync } from 'node:fs';
import { approvePublicationDay, validateApproval } from './publications-approval.mjs';
assert.throws(() => validateApproval({ date:'2026-10-01',format:'Threads',action:'approve' }, undefined));
const url = new URL(process.env.DATABASE_URL);
const mode = url.searchParams.get('sslmode'); url.searchParams.delete('sslmode');
const cert = process.env.PGSSLROOTCERT;
const client = new pg.Client({ connectionString:url.toString(), ssl:mode && mode !== 'disable' ? cert && existsSync(cert) ? { ca:readFileSync(cert,'utf8'),rejectUnauthorized:true } : { rejectUnauthorized:false } : false });
await client.connect();
const pool = { query:(...args)=>client.query(...args),connect:async()=>({query:(...args)=>client.query(...args),release(){}}) };
try {
  await client.query(`create temp table cm_threads_queue(user_id text,publication_id text,part_id text,scheduled_at timestamptz,content_hash text,status text,
    approved_at timestamptz default now(),attempted_at timestamptz,dispatch_id text,container_id text,remote_post_id text,remote_url text,published_at timestamptz,error text,
    primary key(user_id,publication_id,part_id));
    create temp table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz);
    create temp table cm_threads_workers(user_id text,username text,healthy boolean,last_seen timestamptz);
    set search_path to pg_temp;`);
  const date = '2030-10-01';
  const part = id => ({id,text:`Fixture ${id}`,published:false,scheduledAt:`${date}T10:00:00+02:00`,approvalStatus:'draft'});
  const data = {schema:1,items:[{id:'a',date,format:'Threads',parts:[part('1'),part('2')]},{id:'b',date,format:'Threads',parts:[part('3')]},{id:'tg',date,format:'Пост ТГ',parts:[part('4')]},{id:'other',date:'2030-10-02',format:'Threads',parts:[part('5')]}]};
  await client.query('insert into cm_user_state values($1,$2,$3,now())',['fixture','publications',JSON.stringify(data)]);
  await client.query("insert into cm_threads_workers values('fixture','test',true,now())");
  const revision = async () => (await client.query('select md5(data::text) as revision from cm_user_state')).rows[0].revision;
  const env = {THREADS_REMOTE_ENABLED:'1',THREADS_WORKER_USER_ID:'fixture'};
  const approve = (format, action='approve', rev) => approvePublicationDay(pool,'fixture',{date,format,action},rev,env);
  const initial = await revision();
  const approved = await approve('Threads','approve',initial);
  assert.equal(approved.approved,3); assert.equal(approved.scheduled,true);
  assert.equal((await client.query("select count(*)::int n from cm_threads_queue where status='ready'")).rows[0].n,3);
  assert.equal(approved.data.items[3].parts[0].approvalStatus,'draft');
  await assert.rejects(approve('Threads','approve',initial),/Календарь обновился/);
  await approve('Threads','approve',await revision());
  assert.equal((await client.query('select count(*)::int n from cm_threads_queue')).rows[0].n,3,'repeated approval is not duplicated');
  await client.query("update cm_threads_queue set status='sending' where part_id='2'");
  await assert.rejects(approve('Threads','unapprove',await revision()),/отправляется/);
  assert.equal((await client.query("select status from cm_threads_queue where part_id='1'")).rows[0].status,'ready','rollback is atomic');
  await client.query("update cm_threads_queue set status='ready' where part_id='2'");
  const cancelled = await approve('Threads','unapprove',await revision());
  assert.equal(cancelled.data.items[0].parts[0].approvalStatus,'draft');
  assert.equal((await client.query("select count(*)::int n from cm_threads_queue where status='cancelled'")).rows[0].n,3);
  const tg = await approve('Пост ТГ','approve',await revision());
  assert.equal(tg.scheduled,false); assert.equal(tg.data.items[2].parts[0].approvalStatus,'approved');
  assert.equal((await client.query('select count(*)::int n from cm_threads_queue')).rows[0].n,3);
  await client.query("update cm_threads_workers set healthy=false");
  await assert.rejects(approve('Threads','approve',await revision()),/не подключён/);
  await client.query("update cm_threads_workers set healthy=true");
  const past = structuredClone(tg.data); past.items[0].parts[1].scheduledAt='2020-10-01T10:00:00+02:00';
  await client.query('update cm_user_state set data=$1',[JSON.stringify(past)]);
  await assert.rejects(approve('Threads','approve',await revision()),/будущее время/);
  assert.equal((await client.query("select count(*)::int n from cm_threads_queue where status='ready'")).rows[0].n,0);
  console.log('PASS daily approval: all series for date/format; revision; isolation; no duplicate jobs; atomic rollback; cancellation; approval-only formats; disconnected/past rejected. Temporary tables only.');
} finally { await client.end(); }
