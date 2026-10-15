import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { ensureReferralSchema, ensureReferralAccount, rememberReferralEntry, completeReferralAuthorization, referralSummary, referralCode, referralStart } from './referrals.mjs';

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
    await completeReferralAuthorization(pool, '3', other);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'first bot source wins over later site source');
    assert.equal((await referralSummary(pool, '2', 'https://example.test')).balance, 0);
    await completeReferralAuthorization(pool, '3', code);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).invited, 1, 'repeat login does not award');
    await completeReferralAuthorization(pool, '2', code);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'existing account ineligible');
    const self = await add('4');
    assert.equal((await completeReferralAuthorization(pool, '4', self)).awarded, false);
    await add('5');
    await assert.rejects(completeReferralAuthorization(pool, '5', code, async () => { throw Error('session storage failed'); }));
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 50, 'failure rolls back reward');
    assert.equal((await query('select first_authorized_at from cm_referral_accounts where user_id=$1', ['5'])).rows[0].first_authorized_at, null);
    await completeReferralAuthorization(pool, '5', code);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'retry succeeds once');
    await rememberReferralEntry(pool, '106', code);
    await query("update cm_referral_entries set created_at=now()-interval '31 days' where telegram_id='106'");
    await add('6'); await completeReferralAuthorization(pool, '6', '');
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'expired bot source ignored');
    await add('7'); await completeReferralAuthorization(pool, '7', ''); await completeReferralAuthorization(pool, '7', code);
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'organic first login cannot be retroactively referred');
    await add('8'); await completeReferralAuthorization(pool, '8', 'f'.repeat(24));
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).balance, 100, 'unknown code ignored');
    const summary = await referralSummary(pool, '1', 'https://example.test');
    assert.equal(summary.url, 'https://example.test/?ref=' + code);
    assert.equal(summary.reward, 50); assert.equal(summary.transactions.length, 2);
    assert.ok(summary.transactions.every(t => !('invited_user_id' in t)), 'friend identities remain private');
    await assert.rejects(query('insert into cm_like_transactions values($1,$2,$3,$4,now())', ['duplicate', '2', '3', 50]));
    await assert.rejects(query('insert into cm_like_transactions values($1,$2,$3,$4,now())', ['invalid', '1', '8', -50]));
    assert.equal((await referralSummary(pool, '1', 'https://example.test')).url, summary.url, 'stable link');
  } finally { await db.close(); }
});
