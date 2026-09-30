import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { remoteAuthorized, claimRemoteJob, recordRemoteResult, handleRemoteRequest } from './threads-remote.mjs';
import { publisherConfig, createPublisher } from './threads-publisher.mjs';

const secret = 'x'.repeat(48);
const config = { origin: 'https://kartakontenta.ru', secret, token: 'test-token', username: 'owner' };
const part = { id: 'part', text: 'Approved text', scheduledAt: '2026-10-01T10:00:00+02:00', approvalStatus: 'approved', published: false };
const job = { publication_id: 'series', part_id: 'part', content_hash: createHash('sha256').update(`${part.text}\0${part.scheduledAt}`).digest('hex'), status: 'sending' };
function fakePool(handler) {
  const queries = [];
  const client = { async query(sql, params) { queries.push({ sql, params }); return handler(sql, params); }, release() {} };
  return { queries, connect: async () => client };
}

test('bridge denies missing/incorrect credentials and never claims when disabled', async () => {
  assert.equal(remoteAuthorized('Bearer anything', ''), false);
  assert.equal(remoteAuthorized(`Bearer ${secret}no`, secret), false);
  assert.equal(remoteAuthorized(`Bearer ${secret}`, secret), true);
  let response;
  await handleRemoteRequest({ req: { headers: { authorization: `Bearer ${secret}` }, method: 'POST' }, path: '/api/internal/threads/claim',
    env: { THREADS_WORKER_SECRET: secret, THREADS_WORKER_USER_ID: 'owner', THREADS_REMOTE_ENABLED: '0' },
    pool: { connect() { throw new Error('Must not claim'); } }, send: (_res, status, value) => { response = { status, value }; } });
  assert.deepEqual(response, { status: 200, value: { job: null } });
});

test('changed text after approval never reaches foreign worker', async () => {
  const pool = fakePool(sql => ({ rows: sql.startsWith('select *') ? [job] : sql.startsWith('select data') ? [{ data: { items: [{ id: 'series', parts: [{ ...part, text: 'Changed' }] }] } }] : [] }));
  assert.equal(await claimRemoteJob(pool, 'owner'), null);
  assert.ok(pool.queries.some(x => x.sql.includes("status='stale'")));
  assert.equal(pool.queries.some(x => x.sql.includes("set status='sending'")), false);
});

test('claim returns only approved text, publication ID and a unique dispatch ID', async () => {
  const pool = fakePool(sql => ({ rows: sql.startsWith('select *') ? [job] : sql.startsWith('select data') ? [{ data: { items: [{ id: 'series', title: 'Series', parts: [part] }] } }] : [] }));
  const result = await claimRemoteJob(pool, 'owner');
  assert.equal(result.text, part.text);
  assert.match(result.dispatchId, /^[a-f0-9-]{36}$/);
  assert.equal('token' in result, false);
});

test('confirmed result updates queue and calendar in one transaction', async () => {
  const current = { ...part };
  const pool = fakePool(sql => ({ rows: sql.startsWith('select *') ? [job] : sql.startsWith('select data') ? [{ data: { items: [{ id: 'series', parts: [current] }] } }] : [] }));
  await recordRemoteResult(pool, 'owner', { dispatchId: 'dispatch', status: 'published', remoteId: '123', permalink: 'https://www.threads.com/@owner/post/abc' });
  assert.equal(current.published, true);
  assert.ok(pool.queries.some(x => x.sql.includes("status='published'")));
  assert.equal(pool.queries.at(-1).sql, 'commit');
});

test('a repeated completion is idempotent and conflicting ID is rejected', async () => {
  const pool = fakePool(() => ({ rows: [{ ...job, status: 'published', remote_post_id: '123' }] }));
  await recordRemoteResult(pool, 'owner', { dispatchId: 'dispatch', status: 'published', remoteId: '123' });
  assert.equal(pool.queries.length, 3);
  await assert.rejects(recordRemoteResult(pool, 'owner', { dispatchId: 'dispatch', status: 'published', remoteId: '456' }), /result_conflict/);
});

test('worker durably checkpoints before publishing and sends tokens only to Meta', async () => {
  const stages = []; const requests = [];
  const worker = createPublisher(config, async (url, init) => {
    requests.push({ url, init });
    if (url.endsWith('/me/threads_publish')) assert.equal(stages.at(-1), 'publishing');
    return { ok: true, status: 200, json: async () => url.endsWith('/me/threads') ? { id: '100' } : url.endsWith('/me/threads_publish') ? { id: '200' } : url.includes('permalink') ? { permalink: 'https://www.threads.com/@owner/post/abc' } : { ok: true } };
  });
  const result = await worker.publish({ dispatchId: 'dispatch', text: 'hello' }, value => stages.push(value.stage));
  assert.equal(result.remoteId, '200');
  assert.deepEqual(stages.slice(0, 3), ['container', 'publishing', 'published']);
  assert.ok(requests.filter(x => x.url.startsWith(config.origin)).every(x => !JSON.stringify(x).includes(config.token)));
});

test('lost checkpoint acknowledgement prevents publish request', async () => {
  let publishCalls = 0;
  const worker = createPublisher(config, async url => {
    if (url.endsWith('/me/threads_publish')) publishCalls++;
    if (url.startsWith(config.origin)) throw new Error('Connection interrupted');
    return { ok: true, json: async () => ({ id: '100' }) };
  });
  await assert.rejects(worker.publish({ dispatchId: 'dispatch', text: 'hello' }, () => {}), /Connection interrupted/);
  assert.equal(publishCalls, 0);
});

test('notification receiver must be in Lina allowed chats', () => {
  assert.throws(() => publisherConfig({ CONTENT_MAP_URL: config.origin, THREADS_WORKER_SECRET: secret, THREADS_ACCESS_TOKEN: 'token', THREADS_USERNAME: 'owner', THREADS_NOTIFY_CHAT_ID: '111', TELEGRAM_ALLOWED_CHAT_IDS: '222' }), /not allowed/);
});
