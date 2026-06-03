# Telegram auth setup

Проект использует только Telegram-авторизацию:

- Telegram Mini App: сервер проверяет `Telegram.WebApp.initData`.
- Обычный браузер: сайт создаёт одноразовый login token и открывает бота с `/start login_<token>`.
- Сессия хранится в `HttpOnly` cookie, подписанной HMAC через `SESSION_SECRET`.
- Пароли и SMS не используются.

## Env

На сервере в `.env.local`:

```env
NODE_ENV=production
AUTH_PORT=3001
APP_URL=https://kartakontenta.ru
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=verify-full
PGSSLROOTCERT=/path/to/ca.crt

TELEGRAM_BOT_TOKEN=000000:telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=long_random_webhook_secret
SESSION_SECRET=long_random_session_secret

ADMIN_TOKEN=long_random_admin_token
ADMIN_TELEGRAM_IDS=123456789
```

`SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET` и `ADMIN_TOKEN` должны быть разными длинными случайными строками.

## BotFather

1. Создать или открыть бота.
2. `/setdomain` -> `kartakontenta.ru`.
3. Для Mini App указать URL `https://kartakontenta.ru`.
4. После деплоя настроить webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://kartakontenta.ru/api/telegram/webhook","secret_token":"TELEGRAM_WEBHOOK_SECRET","allowed_updates":["message","edited_message"]}'
```

Или через API проекта:

```bash
curl -X POST https://kartakontenta.ru/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"secret":"TELEGRAM_WEBHOOK_SECRET"}'
```

## Prisma

Модели авторизации:

- `User`
- `AuthIdentity`
- `TelegramAccount`
- `TelegramLoginRequest`

После установки зависимостей Prisma Client генерируется автоматически через `postinstall`.

Для ручной синхронизации схемы:

```bash
npm run prisma:generate
npm run prisma:db-push
```

На проде сервер также создаёт нужные таблицы при старте, чтобы деплой не падал из-за непрогнанной миграции.

## Проверка

```bash
npm run build
node --check server/telegram-auth-server.mjs
systemctl restart kartakontenta
systemctl is-active kartakontenta
```

Ручные проверки:

- `GET /api/auth/me` возвращает текущего пользователя или `null`;
- `POST /api/auth/logout` очищает cookie;
- Mini App открывается внутри Telegram и входит через `initData`;
- браузерный вход открывает бота с одноразовым token;
- webhook отклоняет запросы без правильного `TELEGRAM_WEBHOOK_SECRET`;
- после входа пользователь появляется в `users`, `auth_identities`, `telegram_accounts`.
