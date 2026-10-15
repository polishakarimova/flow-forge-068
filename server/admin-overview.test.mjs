import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { buildAdminOverview, readAdminOverview, summarizeWorkspace } from './admin-overview.mjs';
import { adminEntry, adminKeyboard, isPrivateAdmin } from './admin-bot.mjs';

const clock = Date.parse('2026-10-15T12:00:00Z');
const account = { id: 'owner', name: 'Проверочный аккаунт', telegram_id: '123', username: 'fixture', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' };
const main = { products: [{ id: 1 }], keywords: ['СТАРТ'], funnels: [{ id: 'f', active: true, contentItemIds: [2] }], topics: [null,
  { id: 1, isIdeaBank: true, contentItems: [{ id: 1, platformId: 'reels', status: 'ready', productId: 1, cta: 'Напишите', revision: 2, approvedRevision: 1, scriptApproval: 'approved', body: 'PRIVATE TEXT', metrics: { reach: 100, leads: 3, sales: 1, responses: 5 } }] },
  { id: 2, contentItems: [{ id: 2, platformId: 'threads', status: 'published', productId: 999, revision: 1, approvedRevision: 1, scriptApproval: 'approved', metrics: { reach: -3, sales: '9' } }] },
  { id: 3, archived: true, contentItems: [{ id: 3, status: 'published', metrics: { reach: 1000 } }] },
] };
const publications = { items: [{ id: 'p', parts: [{ id: 'a', published: true }, { id: 'b', approvalStatus: 'approved' }, { id: 'c' }] }] };
test('workspace counts omit archived content, validate links and revisions, keep calendar marks separate', () => {
  const result = summarizeWorkspace(main, publications);
  assert.deepEqual(result.stats, { products: 1, topics: 1, ideas: 1, archivedIdeas: 1, contentItems: 2, funnels: 1, keywords: 1, calendarItems: 1 });
  assert.equal(result.content.withProduct, 1); assert.equal(result.content.withFunnel, 1); assert.equal(result.content.withCta, 1); assert.equal(result.content.approvedScripts, 1);
  assert.deepEqual(result.content.results, { materials: 1, reach: 100, responses: 5, leads: 3, sales: 1, coverage: { reach: 1, responses: 1, leads: 1, sales: 1 } });
  assert.deepEqual(result.calendar, { parts: 3, published: 1, approved: 1, drafts: 1 });
  assert.ok(!JSON.stringify(result).includes('PRIVATE TEXT'));
});
test('empty and malformed lists have no invented results', () => {
  const r = summarizeWorkspace({ products: {}, topics: [null, []], funnels: 'wrong' }, {});
  assert.equal(r.stats.contentItems, 0); assert.equal(r.content.results.materials, 0);
});
test('period boundary uses Kaliningrad days, active users and live agents are distinct', () => {
  const result = buildAdminOverview({ clock, days: 7, accounts: [account, { ...account, id: 'new', created_at: '2026-10-08T22:30:00Z', updated_at: '2026-10-08T22:30:00Z' }],
    states: [{ user_id: 'owner', key: 'main', data: main, updated_at: '2026-10-14T00:00:00Z' }],
    logins: [{ user_id: 'owner', date: '2026-10-09', last_login: '2026-10-08T22:05:00Z' }, { user_id: 'orphan', date: '2026-10-09', last_login: '2026-10-09T00:00:00Z' }],
    agents: [{ user_id: 'owner', connected_at: '2026-10-01', refresh_expires_at: '2026-11-01' }, { user_id: 'owner', connected_at: '2026-10-01', refresh_expires_at: '2026-10-14' }, { user_id: 'new', connected_at: '2026-10-01', refresh_expires_at: '2026-11-01', revoked_at: '2026-10-14' }] });
  assert.equal(result.period.from, '2026-10-09'); assert.equal(result.audience.newUsers, 1); assert.equal(result.audience.activeUsers, 2); assert.equal(result.audience.returningUsers, 1);
  assert.equal(result.audience.daily[0].signIns, 1); assert.equal(result.audience.daily[0].registrations, 1); assert.equal(result.agents.connected, 1); assert.equal(result.agents.owners, 1);
  assert.equal(result.audience.adoption.complete, 1); assert.equal(result.audience.adoption.empty, 1);
  assert.equal(result.users.find(u => u.id === 'owner').connectedAgents, 1);
});
test('admin bot entry never trusts a username, group, different sender or a bot; keyboard persists', () => {
  const ids = new Set(['123']), url = 'https://example.invalid/';
  const message = { text: 'Admin панель', chat: { type: 'private', id: 123 }, from: { id: 123 } };
  assert.equal(isPrivateAdmin(message, ids), true);
  for (const change of [{ from: { id: 456, username: 'owner' } }, { chat: { type: 'group', id: 123 } }, { from: { id: 123, is_bot: true } }]) assert.equal(Boolean(isPrivateAdmin({ ...message, ...change }, ids)), false);
  for (const text of ['Admin панель', '/admin', '/admin@fixture_bot', '/start admin']) assert.equal(adminEntry({ ...message, text }, ids, url).reply_markup.inline_keyboard[0][0].web_app.url, 'https://example.invalid/admin');
  assert.equal(adminEntry({ ...message, from: { id: 456 } }, ids, url).reply_markup, undefined);
  assert.equal(adminEntry({ ...message, text: '/start login_abc' }, ids, url), null);
  assert.equal(adminEntry({ ...message, chat: { type: 'group', id: 123 } }, ids, url), null);
  const keyboard = adminKeyboard(); assert.equal(keyboard.is_persistent, true); assert.equal(keyboard.one_time_keyboard, false); assert.equal(keyboard.resize_keyboard, true);
  assert.deepEqual(keyboard.keyboard, [[{ text: 'Admin панель' }]]);
});
test('SQL snapshot counts unique daily sign-ins, all account state, and exposes no context or secrets', async () => {
  const db = new PGlite();
  const query = async (sql, args) => args ? db.query(sql, args) : (await db.exec(sql)).at(-1);
  const pool = { connect: async () => ({ query, release() {} }) };
  try {
    await db.exec(`create table users(id text,"displayName" text,"createdAt" timestamptz,"updatedAt" timestamptz);
      create table telegram_accounts(id text,"userId" text,"telegramId" text,username text,"createdAt" timestamptz);
      create table cm_user_state(user_id text,key text,data jsonb,updated_at timestamptz);
      create table cm_auth_sessions(user_id text,created_at timestamptz);
      create table cm_agent_connections(id text,user_id text,name text,connected_at timestamptz,revoked_at timestamptz,refresh_expires_at timestamptz,access_hash text);
      create table cm_agent_actions(agent_id text,tool text,created_at timestamptz,result jsonb);
      create table cm_threads_queue(status text);
      create table cm_threads_connections(expires_at timestamptz);
      create table cm_threads_workers(healthy boolean,last_seen timestamptz);
      insert into users values('owner','Проверка',now(),now());
      insert into telegram_accounts values('tg','owner','123','fixture',now());
      insert into cm_auth_sessions values('owner',now()),('owner',now());
      insert into cm_threads_queue values('ready'),('uncertain');
      insert into cm_agent_connections values('agent','owner','Мой агент',now(),null,now()+interval '1 day','SECRET HASH');
      insert into cm_agent_actions values('agent','karta_material_save',now(),'{"private":"SECRET RESULT"}');`);
    await db.query('insert into cm_user_state values($1,$2,$3,now()),($1,$4,$5,now()),($1,$6,$7,now())', ['owner', 'main', JSON.stringify(main), 'publications', JSON.stringify(publications), 'context', '{"secret":"PRIVATE CONTEXT"}']);
    const result = await readAdminOverview(pool, { days: 7 });
    assert.equal(result.audience.daily.at(-1).signIns, 1); assert.equal(result.totals.contentItems, 2); assert.equal(result.agents.actions, 1); assert.equal(result.publishing.queue.uncertain, 1);
    assert.equal(result.agents.recent[0].name, 'Мой агент'); assert.equal(result.system.database, 'ok');
    for (const secret of ['PRIVATE TEXT', 'PRIVATE CONTEXT', 'SECRET HASH', 'SECRET RESULT']) assert.ok(!JSON.stringify(result).includes(secret));
  } finally { await db.close(); }
});
test('failed snapshot rolls back and releases its connection', async () => {
  const calls = []; let released = false;
  await assert.rejects(readAdminOverview({ connect: async () => ({ query: async sql => { calls.push(sql); if (sql.startsWith('select')) throw Error('unavailable'); }, release() { released = true; } }) }), /unavailable/);
  assert.ok(calls.includes('rollback')); assert.equal(released, true);
});
