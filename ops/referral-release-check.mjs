import { readEnv, databasePool, fingerprint } from './db-config.mjs';
const pool = databasePool(readEnv(process.argv[2] || '/etc/kartakontenta/runtime.env'));
try {
  const state = await fingerprint(pool);
  const { rows: [counts] } = await pool.query('select (select count(*)::int from users) as users,(select count(*)::int from cm_agent_connections where revoked_at is null) as agents');
  const referrals = {};
  for (const table of ['cm_referral_accounts', 'cm_referral_entries', 'cm_like_transactions']) {
    const { rows: [exists] } = await pool.query('select to_regclass($1) as present', [table]);
    referrals[table] = exists.present ? (await pool.query('select count(*)::int as n from ' + table)).rows[0].n : null;
  }
  console.log(JSON.stringify({ state, ...counts, referrals }));
} finally { await pool.end(); }
