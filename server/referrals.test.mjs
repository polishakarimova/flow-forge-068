import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureReferralSchema, ensureReferralAccount, rememberReferralEntry, startReferralSession, finalizeReferral, referralSummary, referralCode, referralStart } from './referrals.mjs';
import { ensureLegalSchema, legalManifest, saveLegalChoice } from './legal-consent.mjs';

test('referral values reject malformed and overlong sources', () => {
  for (const value of ['', null, '../secret', 'a'.repeat(25), 'A'.repeat(24), '<script>']) assert.equal(referralCode(value), '');
  assert.equal(referralStart('ref_' + 'a'.repeat(24)), 'a'.repeat(24));
  assert.equal(referralStart('ref_' + 'a'.repeat(24) + '_extra'), '');
});

test('real SQL ledger: first completed login, old accounts, replay, first source, expiry and rollback', async () => {
  const db = new PGlite();
  const query = async (sql, params) => {
    if (!params && /;\s*\S/.test(sql.trim().replace(/;$/, ''))) { await db.exec(sql); return { rows: [], rowCount: 0 }; }
    const result = await db.query(sql, params);
    return { ...result, rowCount: result.affectedRows ?? result.rows.length };
  };
  const client = { query, release() {} }, pool = { query, async connect() { return client; } };
  try {
    await db.exec('create table users(id text primary key);create table telegram_accounts("telegramId" text unique,"userId" text);create table telegram_login_requests(id text);');
    await ensureReferralSchema(pool);
    await ensureLegalSchema(pool);
    const open = (id, code, issue = async () => 'test-session') => startReferralSession(pool,id,code,issue);
    const choice = {version:legalManifest.version,manifestHash:legalManifest.manifestHash,terms:true,personalData:false,advertising:false};
    const accept = (id, onFirstAccept = finalizeReferral) => saveLegalChoice(pool,id,choice,{onFirstAccept});
    const add = async (id, isNew = true) => {
      await query('insert into users values($1)', [id]);
      await query('insert into telegram_accounts values($1,$2)', [String(100 + Number(id)), id]);
      await ensureReferralAccount(pool, id);
      if (isNew) await query('update cm_referral_accounts set new_user=true where user_id=$1', [id]);
      return (await query('select code from cm_referral_accounts where user_id=$1', [id])).rows[0].code;
    };
    const code = await add('1', false), other = await add('2', false);
    await rememberReferralEntry(pool, '103', code);
    await rememberReferralEntry(pool, '103', other);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 0, 'bot entry does not award');
    await add('3');
    await open('3', other);
    await open('3', other);
    assert.equal((await referralSummary(pool,'1','https://example.test')).balance,0,'verified session before consent gives no reward');
    await accept('3');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'first bot source wins over later site source');
    assert.equal((await referralSummary(pool, '2', 'https://example.test')).balance, 0);
    await open('3', code); await accept('3');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).invited, 1, 'repeat login does not award');
    await open('2', code); await accept('2');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'existing account ineligible');
    const self = await add('4');
    await open('4', self); await accept('4');
    assert.equal((await referralSummary(pool,'4','https://example.test')).balance,0);
    await add('5');
    await assert.rejects(open('5', other, async () => { throw Error('session storage failed'); }));
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'failure rolls back reward');
    assert.equal((await query('select first_authorized_at from cm_referral_accounts where user_id=$1', ['5'])).rows[0].first_authorized_at, null);
    await open('5', code);
    await assert.rejects(accept('5',async(tx,id)=>{await finalizeReferral(tx,id);throw Error('notice queue unavailable');}));
    assert.equal((await referralSummary(pool,'1','https://example.test')).balance,50,'consent, ledger and notice roll back together');
    assert.equal((await query("select * from cm_legal_state where user_id='5'")).rows.length,0);
    await accept('5');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'retry succeeds once');
    await rememberReferralEntry(pool, '106', code);
    await query("update cm_referral_entries set created_at=now()-interval '31 days' where telegram_id='106'");
    await add('6'); await open('6', ''); await accept('6');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'expired bot source ignored');
    await add('7'); await open('7', ''); await open('7', code); await accept('7');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'organic first login cannot be retroactively referred');
    await add('8'); await open('8', 'f'.repeat(24)); await accept('8');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'unknown code ignored');
    const summary = await referralSummary(pool, '1', 'https://example.test');
    assert.equal(summary.url, 'https://example.test/?ref=' + code);
    assert.equal(summary.reward, 50); assert.equal(summary.transactions.length, 2);
    assert.ok(summary.transactions.every(t => !('invited_user_id' in t)), 'friend identities remain private');
    await assert.rejects(query('insert into cm_like_transactions values($1,$2,$3,$4,now())', ['duplicate', '2', '3', 50]));
    await assert.rejects(query('insert into cm_like_transactions values($1,$2,$3,$4,now())', ['invalid', '1', '8', -50]));
    await add('9');
    await query("update cm_referral_accounts set first_authorized_at=now(),new_user=false where user_id='9'");
    await query("insert into cm_like_transactions values('old','2','9',50,now())");
    await ensureReferralSchema(pool);
    await open('9', code); await accept('9');
    assert.equal((await referralSummary(pool,'2','https://example.test')).balance,50,'historical award remains untouched after migration');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).url, summary.url, 'stable link');
  } finally { await db.close(); }
});
