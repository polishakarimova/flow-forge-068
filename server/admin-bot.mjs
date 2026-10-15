export function isPrivateAdmin(message, adminIds) {
  return message?.chat?.type === 'private' && message.from && !message.from.is_bot &&
    String(message.chat.id) === String(message.from.id) && adminIds.has(String(message.from.id));
}
export function adminKeyboard() {
  // Reply-keyboard Web Apps do not receive signed initData. Use a persistent
  // command button, then an inline Web App button that carries Telegram auth.
  return { keyboard: [[{ text: 'Admin панель' }]], resize_keyboard: true, is_persistent: true, one_time_keyboard: false };
}
export function adminEntry(message, adminIds, appUrl) {
  if (!/^(?:\/admin(?:@\w+)?|\/start(?:@\w+)?\s+admin|Admin панель|Админ панель|Админка)\s*$/i.test(String(message?.text || '').trim())) return null;
  if (message?.chat?.type !== 'private' || !message.chat.id) return null;
  const allowed = isPrivateAdmin(message, adminIds);
  return { chat_id: message.chat.id, text: allowed ? 'Админ-панель Карты контента. Откройте показатели кнопкой ниже.' : 'Для этого Telegram-аккаунта доступ администратора не выдан.',
    ...(allowed ? { reply_markup: { inline_keyboard: [[{ text: 'Admin панель', web_app: { url: appUrl.replace(/\/$/, '') + '/admin' } }]] } } : {}) };
}
