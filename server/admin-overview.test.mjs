import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureNoticeSchema,firstAuthorization,recordFault,readNotices,noticeQueueStatus,deliverNotice,noticeRecipient,recordTelegramFailure,recordTelegramSuccess} from './admin-notices.mjs';
import {ensureLegalSchema,saveLegalChoice,legalManifest} from './legal-consent.mjs';
import {pendingHealthChanges,sendHealthChanges} from '../ops/health.mjs';
import { PGlite } from '@electric-sql/pglite';
import { buildAdminOverview, readAdminOverview } from './admin-overview.mjs';
import { summarizeWorkspace } from './workspace-summary.mjs';
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
    assert.equal(result.content, undefined); assert.equal(result.calendar, undefined); assert.ok(!JSON.stringify(result).includes('reach'));
    assert.equal(result.agents.recent[0].name, 'Мой агент'); assert.equal(result.system.database, 'ok');
    for (const secret of ['PRIVATE TEXT', 'PRIVATE CONTEXT', 'SECRET HASH', 'SECRET RESULT']) assert.ok(!JSON.stringify(result).includes(secret));
  } finally { await db.close(); }
});
test('failed snapshot rolls back and releases its connection', async () => {
  const calls = []; let released = false;
  await assert.rejects(readAdminOverview({ connect: async () => ({ query: async sql => { calls.push(sql); if (sql.startsWith('select')) throw Error('unavailable'); }, release() { released = true; } }) }), /unavailable/);
  assert.ok(calls.includes('rollback')); assert.equal(released, true);
});

test('first accepted login and fault groups reach only the configured owner and survive a failed delivery', async () => {
  assert.equal(noticeRecipient({ADMIN_TELEGRAM_IDS:'11,22'}),'');
  assert.equal(noticeRecipient({ADMIN_TELEGRAM_IDS:'11',ADMIN_NOTICE_TELEGRAM_ID:'22'}),'');
  assert.equal(noticeRecipient({ADMIN_TELEGRAM_IDS:'11'}),'11');
  const db=new PGlite();
  const query=async(sql,args)=>args?db.query(sql,args):(await db.exec(sql)).at(-1);
  const pool={query,connect:async()=>({query,release(){}})};
  try {
    await ensureNoticeSchema(pool);await ensureLegalSchema(pool);
    await db.exec(`create table users(id text primary key,"displayName" text);
      create table telegram_accounts(id text,"userId" text,"telegramId" text,username text,"createdAt" timestamptz);
      create table cm_like_transactions(user_id text,invited_user_id text);
      insert into users values('author','Автор'),('friend','Друг');
      insert into telegram_accounts values('t','author','123','author',now());
      insert into cm_like_transactions values('friend','author');`);
    const choice={version:legalManifest.version,manifestHash:legalManifest.manifestHash,terms:true,personalData:false,advertising:false};
    const opt={onFirstAccept:firstAuthorization};
    assert.equal((await readNotices(pool)).length,0);
    await saveLegalChoice(pool,'author',choice,opt);await saveLegalChoice(pool,'author',choice,opt);
    const future={...legalManifest,manifestHash:'new-edition'};
    await saveLegalChoice(pool,'author',{...choice,manifestHash:future.manifestHash},{...opt,manifest:future});
    const faults={kind:'api',path:'/api/auth/start?token=private-value',method:'POST',status:503,reason:'private-value'};
    await recordFault(pool,faults,600000);await recordFault(pool,faults,601000);
    let rows=await readNotices(pool);
    assert.equal((await noticeQueueStatus(pool)).pending,2);
    assert.equal(rows.length,2);assert.equal(rows.find(r=>r.kind==='api').occurrences,2);
    assert.equal(rows.find(r=>r.kind==='authorized').inviter,'Друг');
    assert.ok(!JSON.stringify(rows).includes('private-value'));
    await assert.rejects(deliverNotice(pool,'11','https://example.invalid',async()=>{throw Error('transport unavailable');}));
    await db.exec("update cm_admin_notices set next_at=now()");
    const sent=[];
    while(await deliverNotice(pool,'11','https://example.invalid',async(method,payload)=>{sent.push(payload);})){}
    assert.equal(sent.length,2);
    assert.ok(sent.every(x=>x.chat_id==='11'&&x.reply_markup.inline_keyboard[0][0].web_app.url.startsWith('https://example.invalid/admin?event=')));
    assert.ok(sent.some(x=>x.text.includes('Telegram ID 123')));assert.ok(!JSON.stringify(sent).includes('private-value'));
    assert.ok((await readNotices(pool)).every(r=>r.delivered_at));
    const state=await noticeQueueStatus(pool);assert.equal(state.pending,0);assert.ok(state.last_delivered_at);assert.equal(state.oldest_pending_at,null);
  } finally {await db.close();}
});

test('system monitoring preserves an outage and recovery across downtime of its delivery channel',async()=>{
  const at='2026-11-22T18:00:00Z',texts=[];
  const outage={alerts:['app_down'],pendingHealth:pendingHealthChanges(['app_down'],null,at)};
  await assert.rejects(sendHealthChanges(outage.pendingHealth,async()=>{throw Error('delivery failed');}));
  assert.deepEqual(pendingHealthChanges(outage.alerts,outage,at),outage.pendingHealth);
  const recovered=pendingHealthChanges([],JSON.parse(JSON.stringify(outage)),at);
  assert.deepEqual([recovered.app_down.raised,recovered.app_down.cleared,recovered.app_down.active],[1,1,false]);
  await sendHealthChanges(recovered,async text=>texts.push(text));
  const pending=pendingHealthChanges([],{alerts:[],pendingHealth:{}},at);
  await sendHealthChanges(pending,async text=>texts.push(text));
  assert.equal(texts.length,1);assert.match(texts[0],/Устранено.*сбоев: 1, восстановлений: 1/);
  assert.deepEqual(pendingHealthChanges(['app_down'],{alerts:['app_down'],reportedAlerts:['app_down']},at),{});
});

test('Telegram incident survives restart, honors the strict threshold and delivers recovery after the warning', async () => {
  const db = new PGlite();
  const pool = {query: (sql,args) => args ? db.query(sql,args) : db.exec(sql).then(rows=>rows.at(-1))};
  const sent = [];
  const deliver = (send = async (_,payload) => sent.push(payload.text)) =>
    deliverNotice(pool,'owner','https://example.invalid',send);
  try {
    await ensureNoticeSchema(pool);
    await db.exec(`create table users(id text, "displayName" text);
      create table telegram_accounts(id text,"userId" text,"telegramId" text,username text,"createdAt" timestamptz);
      create table cm_like_transactions(user_id text,invited_user_id text);`);
    // PostgreSQL now() is constant within this transaction, including the exact threshold.
    await db.exec('begin');
    await recordTelegramFailure(pool,'ECONNRESET');
    await db.exec("update cm_admin_notices set created_at=now()-interval '5 minutes', next_at=now()");
    assert.equal(await deliver(),false);
    await recordTelegramSuccess(pool);
    await db.exec('commit');
    assert.equal(await deliver(),false);
    assert.equal((await noticeQueueStatus(pool)).pending,0);
    assert.equal((await readNotices(pool))[0].kind,'telegram_brief');

    await recordTelegramFailure(pool,'TELEGRAM_502');
    await recordTelegramFailure(pool,'ETIMEDOUT');
    await db.exec("update cm_admin_notices set created_at=now()-interval '6 minutes',next_at=now() where kind='telegram_outage'");
    await assert.rejects(deliver(async()=>{throw Error('offline');}));
    // A fresh caller has no in-memory incident state.
    await recordTelegramSuccess({query:pool.query});
    await recordTelegramSuccess(pool);
    assert.equal(await deliver(),false);
    assert.equal((await noticeQueueStatus(pool)).pending,2);
    await db.exec("update cm_admin_notices set next_at=now() where kind='telegram_outage'");
    assert.equal(await deliver(),true);
    assert.equal(await deliver(),true);
    assert.equal(await deliver(),false);
    assert.match(sent[0],/Сбой связи с Telegram дольше 5 минут/);
    assert.match(sent[0],/ETIMEDOUT/);
    assert.match(sent[1],/Связь с Telegram восстановлена/);
    assert.equal((await readNotices(pool)).find(r=>r.kind==='telegram_outage').occurrences,2);

    await recordTelegramFailure(pool,'TELEGRAM_429');
    await db.exec("update cm_admin_notices set created_at=now()-interval '7 minutes',next_at=now() where recovered_at is null and kind='telegram_outage'");
    assert.equal(await deliver(),true);
    await recordTelegramFailure(pool,'TELEGRAM_429');
    assert.equal(await deliver(),false);
    await recordTelegramSuccess(pool);
    assert.equal(await deliver(),true);
    assert.equal(await deliver(),false);
    assert.equal(sent.length,4);
  } finally { await db.close(); }
});
