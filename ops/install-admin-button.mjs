// Explicit one-time installation in the single configured owner's private chat.
import { readEnv, databasePool } from './db-config.mjs';
import { adminKeyboard } from '../server/admin-bot.mjs';
const env = readEnv(process.env.KARTA_ENV_FILE || '/etc/kartakontenta/runtime.env');
const pool = databasePool(env), ids = String(env.ADMIN_TELEGRAM_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
try {
  if (ids.length !== 1) throw Error('A single administrator must be selected explicitly before sending');
  const { rows } = await pool.query('select "userId" as user_id,"telegramId" as telegram_id from telegram_accounts where "telegramId"=$1', [ids[0]]);
  if (rows.length !== 1) throw Error('Configured administrator account was not found');
  const marker = 'admin-keyboard-20261015-' + rows[0].user_id;
  if ((await pool.query('select id from cm_admin_actions where id=$1', [marker])).rows.length) {
    console.log(JSON.stringify({ installed: true, alreadyInstalled: true }));
  } else {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ chat_id: rows[0].telegram_id, text: 'Админ-панель Карты контента готова. Постоянная кнопка «Admin панель» — внизу под строкой ввода.', reply_markup: adminKeyboard() }),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw Error('Telegram did not confirm installation');
    await pool.query("insert into cm_admin_actions(id,admin_user_id,action,data) values($1,$2,'admin_keyboard_installed',$3::jsonb)", [marker, rows[0].user_id, JSON.stringify({ messageId: result.result.message_id })]);
    console.log(JSON.stringify({ installed: true, alreadyInstalled: false, messageId: result.result.message_id }));
  }
} finally { await pool.end(); }
