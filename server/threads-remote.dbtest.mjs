// Run against PostgreSQL using session-local temporary tables only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { claimRemoteJob, recordRemoteResult, heartbeat, remoteStatus } from './threads-remote.mjs';

const url = new URL(process.env.DATABASE_URL);
const mode = url.searchParams.get('sslmode'); url.searchParams.delete('sslmode');
const cert = process.env.PGSSLROOTCERT;
const client = new pg.Client({ connectionString: url.toString(), ssl: mode && mode !== 'disable'
  ? cert && existsSync(cert) ? { ca: readFileSync(cert, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false } : false });
await client.connect();
const pool = { query: (...args) => client.query(...args), connect: async () => ({ query: (...args) => client.query(...args), release() {} }) };
try {
  await client.query(`create temp table cm_threads_queue (
    user_id text,publication_id text,part_id text,content_hash text,status text,scheduled_at timestamptz,
    dispatch_id text,attempted_at timestamptz,error text,container_id text,remote_post_id text,remote_url text,published_at timestamptz);
    create temp table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz);
    create temp table cm_threads_workers(user_id text primary key,username text,threads_user_id text,healthy boolean,last_seen timestamptz);
    set search_path to pg_temp;`);
  const part = { id: 'part', text: 'Temporary integration fixture', scheduledAt: new Date(Date.now()-1000).toISOString(), approvalStatus: 'approved', published: false };
  const contentHash = createHash('sha256').update(`${part.text}\0${part.scheduledAt}`).digest('hex');
  await client.query('insert into cm_user_state values($1,$2,$3,now())', ['test-owner','publications',JSON.stringify({ items: [{ id: 'series', title: 'Temporary', parts: [part] }] })]);
  await client.query('insert into cm_threads_queue(user_id,publication_id,part_id,content_hash,status,scheduled_at) values($1,$2,$3,$4,$5,$6)', ['test-owner','series','part',contentHash,'ready',part.scheduledAt]);
  await heartbeat(pool,'test-owner',{ username:'test',profileId:'123',healthy:true },'test');
  assert.equal((await remoteStatus(pool,'test-owner')).connected,true);
  const job = await claimRemoteJob(pool,'test-owner');
  assert.equal(job.text,part.text);
  assert.equal(await claimRemoteJob(pool,'test-owner'),null);
  await recordRemoteResult(pool,'test-owner',{ dispatchId:job.dispatchId,status:'container',containerId:'101' });
  await recordRemoteResult(pool,'test-owner',{ dispatchId:job.dispatchId,status:'published',remoteId:'202',permalink:'https://www.threads.com/@test/post/fixture' });
  await recordRemoteResult(pool,'test-owner',{ dispatchId:job.dispatchId,status:'published',remoteId:'202' });
  const state = await client.query('select data from cm_user_state');
  assert.equal(state.rows[0].data.items[0].parts[0].published,true);
  await assert.rejects(recordRemoteResult(pool,'test-owner',{ dispatchId:job.dispatchId,status:'published',remoteId:'303' }),/result_conflict/);
  console.log('PASS PostgreSQL: one claim, checkpoint, atomic calendar update, idempotent result, conflicting ID rejected; session-local fixtures only.');
} finally { await client.end(); }
