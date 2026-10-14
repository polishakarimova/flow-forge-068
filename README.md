# Карта контента

Рабочее пространство для идей, сценариев, продуктов, воронок и календаря. React/TypeScript/Vite на клиенте, Node.js и PostgreSQL на сервере. Вход — через Telegram; материалы и календарь сохраняются совместно с проверкой версий. MCP даёт отдельный доступ агенту и не разрешает отправку публикаций.

## Локальный запуск

Node.js 22.22 или новее. `npm ci`, затем `npm run dev`. Vite слушает только 127.0.0.1:8080 и перенаправляет API на 127.0.0.1:3001. `npm run auth:server` требует собственную тестовую PostgreSQL и переменные из .env.example; не направлять локальный тестовый сервер на рабочие данные.

## Проверки

`npm test`, `node --test server/security.test.mjs server/agent-workspace.test.mjs server/karta-mcp.test.mjs`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`, `npm run build`. Проверка SQL в security.test использует изолированную PostgreSQL WASM. Генерация ORM: `npx prisma generate`.

## Устройство и эксплуатация

- [Структура сервиса](SERVICE_STRUCTURE.md).
- [Авторизация и защита](docs/SECURITY.md).
- [Резервирование и восстановление](docs/BACKUPS.md).
- [Агент и MCP](docs/AGENT_MCP.md).
- [Редактор и согласованное сохранение](docs/EDITORIAL_WORKSPACE.md).

Ключи и окружение не хранятся в Git. Production использует отдельную роль karta_runtime без CREATE/CREATEDB/CREATEROLE. Миграции запускаются отдельно. Выпуск требует резервной копии, проверки сборки и готовности API; ops/deploy.sh сохраняет прежний выпуск для отката.
