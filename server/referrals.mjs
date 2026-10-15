import { randomBytes } from 'node:crypto';

export const REFERRAL_REWARD = 50;
export const referralCode = value => /^[a-f0-9]{24}$/.test(String(value || '')) ? String(value) : '';
export const referralStart = value => referralCode(String(value || '').match(/^ref_([a-f0-9]{24})$/)?.[1]);

export async function ensureReferralSchema(pool) {
  await pool.query(`
    alter table telegram_login_requests add column if not exists "referralCode" text;
    create table if not exists cm_referral_accounts (
      user_id text primary key references users(id) on delete cascade,
      code text not null unique check (code ~ '^[a-f0-9]{24}$'),
      new_user boolean not null default false,
      first_authorized_at timestamptz
    );
    create table if not exists cm_referral_entries (
      telegram_id text primary key,
      code text not null,
      created_at timestamptz not null default now()
    );
    create table if not exists cm_like_transactions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      invited_user_id text not null unique references users(id) on delete cascade,
      amount integer not null check (amount = 50),
      created_at timestamptz not null default now(),
      check (user_id <> invited_user_id)
    );
    create index if not exists cm_like_transactions_owner_idx on cm_like_transactions(user_id, created_at desc);
  `);
}

export async function ensureReferralAccount(pool, userId) {
  await pool.query('insert into cm_referral_accounts(user_id,code) values($1,$2) on conflict(user_id) do nothing', [userId, randomBytes(12).toString('hex')]);
}

// Merely starting the bot never creates an app user or awards a reward.
export async function rememberReferralEntry(pool, telegramId, value) {
  const code = referralCode(value);
  if (!code || !/^\d+$/.test(String(telegramId || ''))) return;
  await pool.query(`insert into cm_referral_entries(telegram_id,code)
    select $1,$2 where exists(select 1 from cm_referral_accounts where code=$2)
    and not exists(select 1 from telegram_accounts where "telegramId"=$1)
    on conflict(telegram_id) do update set code=excluded.code,created_at=now()
    where cm_referral_entries.created_at <= now()-interval '30 days'`, [String(telegramId), code]);
}

// The browser must redeem its confirmed login; a bot confirmation alone is insufficient.
// Locking the new account and the unique invited_user_id make retries/concurrent logins safe.
export async function completeReferralAuthorization(pool, userId, value, finish = async () => null) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await ensureReferralAccount(client, userId);
    const { rows: [account] } = await client.query('select * from cm_referral_accounts where user_id=$1 for update', [userId]);
    if (account.first_authorized_at) { const session = await finish(client); await client.query('commit'); return { awarded: false, session }; }
    const { rows: [entry] } = await client.query(`select e.code from cm_referral_entries e
      join telegram_accounts t on t."telegramId"=e.telegram_id
      where t."userId"=$1 and e.created_at>now()-interval '30 days' order by e.created_at limit 1`, [userId]);
    const code = entry?.code || referralCode(value);
    let awarded = false;
    if (account.new_user && code) {
      const result = await client.query(`insert into cm_like_transactions(id,user_id,invited_user_id,amount)
        select $1,a.user_id,$2,$3 from cm_referral_accounts a where a.code=$4 and a.user_id<>$2
        and not exists(select 1 from telegram_accounts t join telegram_accounts own
          on t."telegramId"=own."telegramId" where t."userId"=$2 and own."userId"=a.user_id)
        on conflict(invited_user_id) do nothing returning id`, ['referral:' + userId, userId, REFERRAL_REWARD, code]);
      awarded = result.rowCount === 1;
    }
    await client.query('update cm_referral_accounts set first_authorized_at=now(),new_user=false where user_id=$1', [userId]);
    await client.query('delete from cm_referral_entries where telegram_id in(select "telegramId" from telegram_accounts where "userId"=$1)', [userId]);
    const session = await finish(client);
    await client.query('commit');
    return { awarded, amount: awarded ? REFERRAL_REWARD : 0, session };
  } catch (error) { await client.query('rollback'); throw error; }
  finally { client.release(); }
}

export async function referralSummary(pool, userId, appUrl) {
  await ensureReferralAccount(pool, userId);
  const { rows: [account] } = await pool.query('select code from cm_referral_accounts where user_id=$1', [userId]);
  const { rows: [totals] } = await pool.query('select coalesce(sum(amount),0)::integer as balance,count(*)::integer as invited from cm_like_transactions where user_id=$1', [userId]);
  const { rows: transactions } = await pool.query('select id,amount,created_at as "createdAt" from cm_like_transactions where user_id=$1 order by created_at desc,id desc limit 50', [userId]);
  return { ...totals, reward: REFERRAL_REWARD, url: new URL('/?ref=' + account.code, appUrl).href, transactions };
}
