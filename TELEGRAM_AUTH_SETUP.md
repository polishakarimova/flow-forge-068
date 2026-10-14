# Telegram auth setup

## Recovery mode (27 September 2026)

The Mini App loads the official Telegram Web App SDK in `index.html`; `AuthProvider` verifies its signed `initData` with the existing backend when no session exists. Never authenticate from `initDataUnsafe`.

When incoming webhook connections time out, set `TELEGRAM_UPDATES_MODE=polling` for the app service. Startup removes the webhook **without dropping queued updates**, then receives updates via authenticated Bot API long polling. Processing and login validation remain shared with the webhook handler. Failed updates are retried before acknowledgement. Use exactly one application instance in polling mode. Reverting the variable to `webhook` and restarting restores webhook delivery.

The browser stores only its own pending, short-lived request in sessionStorage and resumes it after a blocked popup. A second click must not create a different login request. Login expiry remains ten minutes; no auth validation is bypassed.

References: https://core.telegram.org/bots/api#getupdates and https://core.telegram.org/bots/webapps#initializing-mini-apps.

Проект использует только Telegram-авторизацию:

- Telegram Mini App: сервер проверяет `Telegram.WebApp.initData`.
- Обычный браузер: сайт создаёт одноразовый login token, привязанный к закрытой cookie этого браузера, и открывает бота с `/start login_<token>`. В боте нужно отдельно нажать «Подтвердить вход». Возврат в другой браузер не потребляет токен.
- Сессия хранится в `HttpOnly` cookie, подписанной HMAC через `SESSION_SECRET`; в БД хранится хеш и срок. Logout отзывает серверную запись. На HTTPS cookie Secure с префиксом __Host.
- Пароли и SMS не используются.

## Env

На сервере в закрытом `/etc/kartakontenta/runtime.env` (путь передаётся в KARTA_ENV_FILE):

```env
NODE_ENV=production
AUTH_PORT=3001
APP_URL=https://kartakontenta.ru
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=verify-full
PGSSLROOTCERT=/path/to/ca.crt

TELEGRAM_BOT_TOKEN=000000:telegram_bot_token
TELEGRAM_WEBHOOK_SECRET=long_random_webhook_secret
SESSION_SECRET=long_random_session_secret

ADMIN_TELEGRAM_IDS=123456789
KARTA_SCHEMA_MODE=runtime
```

`SESSION_SECRET` и `TELEGRAM_WEBHOOK_SECRET` — разные случайные строки длиной не менее 32 символов. Админка требует разрешённый Telegram-аккаунт и свежую сессию; ADMIN_TOKEN не используется.

## BotFather

1. Создать или открыть бота.
2. `/setdomain` -> `kartakontenta.ru`.
3. Для Mini App указать URL `https://kartakontenta.ru`.
4. После деплоя настроить webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://kartakontenta.ru/api/telegram/webhook","secret_token":"TELEGRAM_WEBHOOK_SECRET","allowed_updates":["message","edited_message","callback_query"]}'
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

Генерация клиента:

```bash
npm run prisma:generate
```

Production не создаёт таблицы: миграция запускается отдельно через ops/migrate.mjs с KARTA_ENV_FILE=/etc/kartakontenta/migration.env. Приложение использует ограниченную роль karta_runtime. Локальный тестовый стенд может создавать схему при KARTA_SCHEMA_MODE=bootstrap. Произвольный prisma db push на рабочей базе не используется.

## Проверка

```bash
npm run build
node --check server/telegram-auth-server.mjs
systemctl restart kartakontenta
systemctl is-active kartakontenta
```

Ручные проверки:

- `GET /api/auth/me` возвращает текущего пользователя или `null`;
- `POST /api/auth/logout` отзывает сессию и очищает cookie;
- Mini App открывается внутри Telegram и входит через `initData`;
- браузерный вход открывает бота с одноразовым token; /start сам не авторизует, другая учётная запись не подтверждает запрос, другой браузер не потребляет его, два запроса выигрывают только один раз;
- webhook отклоняет запросы без правильного `TELEGRAM_WEBHOOK_SECRET`;
- после входа пользователь появляется в `users`, `auth_identities`, `telegram_accounts`.
