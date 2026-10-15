const routes = new Set(['/home', '/calendar', '/products', '/content', '/context', '/dashboard', '/map', '/profile', '/profile/agents', '/admin', '/agents']);
export function safeAuthReturn(value: string | null | undefined, fallback = '/home') {
  try {
    const url = new URL(value || fallback, 'https://app.invalid');
    if (url.origin === 'https://app.invalid' && routes.has(url.pathname)) return url.pathname + url.search;
  } catch { /* Invalid paths return to the workspace. */ }
  return fallback;
}
export function authErrorMessage(code: string) {
  if(code==='telegram_browser_mismatch')return 'Ссылка для входа создана в другом браузере. Нажмите «Начать» для своего входа.';
  if (['telegram_auth_expired', 'telegram_invalid_hash', 'telegram_user_missing'].includes(code)) return 'Не удалось подтвердить Telegram. Закройте мини-приложение и откройте его снова.';
  if (['login_token_expired', 'login_token_not_found'].includes(code)) return 'Ссылка для входа устарела. Нажмите «Начать» ещё раз.';
  return 'Не удалось войти. Попробуйте ещё раз через несколько секунд.';
}
