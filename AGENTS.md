# AGENTS.md — правила для Codex в проекте «Карта контента»

## Главный принцип

«Карта контента» — это не CRM, не обычный календарь постов и не админка ради админки.

Это компактный SaaS-сервис для экспертов и создателей, который помогает связать контекст, продукты, контент, CTA-слова, воронки, карту связей и календарь в одну понятную систему продаж.

Для пользователя продукт должен выглядеть как спокойная рабочая карта: что продаём, каким контентом ведём, через какие слова и в какие продукты.

Для владельца сервиса админский слой должен быть аккуратным и вторым планом: пользователи, авторизации, данные, рассылки, состояние системы.

Главная фраза бренда:

«Из хаоса контента — в понятную карту продаж»

## Обязательные дизайн-документы

Перед любыми дизайн-правками обязательно прочитай:

- `docs/design/KARTA_KONTENTA_BRAND_GUIDE.md`
- `docs/design/KARTA_KONTENTA_UI_RULES.md`
- `docs/design/KARTA_KONTENTA_VISUAL_CHECKLIST.md`
- `docs/design/KARTA_KONTENTA_COMPONENT_MAP.md`
- `docs/design/KARTA_KONTENTA_REFERENCE_ANALYSIS.md`
- `docs/design/KARTA_KONTENTA_DESIGN_QUALITY_RUBRIC.md`
- `docs/design/KARTA_KONTENTA_SELF_REVIEW_PROCESS.md`
- `docs/design/KARTA_KONTENTA_DO_NOT_REPEAT.md`

Дополнительные проектные документы:

- `DESIGN_SYSTEM.md`
- `SERVICE_STRUCTURE.md`
- `TELEGRAM_AUTH_SETUP.md`

## Дизайн-процесс Karta Kontenta

Перед любой задачей по дизайну, UI, бренду, мобильной вёрстке, карточкам, модалкам, dropdown, чипам, админке или визуальной системе обязательно прочитай:

- `docs/design/KARTA_KONTENTA_REFERENCE_ANALYSIS.md`
- `docs/design/KARTA_KONTENTA_DESIGN_QUALITY_RUBRIC.md`
- `docs/design/KARTA_KONTENTA_SELF_REVIEW_PROCESS.md`
- `docs/design/KARTA_KONTENTA_DO_NOT_REPEAT.md`

После любой дизайн-задачи обязательно сделай self-review по 100-балльной шкале из `KARTA_KONTENTA_DESIGN_QUALITY_RUBRIC.md`.

Если результат ниже 85/100, не завершай задачу: сначала исправь слабые места.

Главный ориентир:

Сначала ясная система продуктов, контента, CTA и воронок.

Потом компактный рабочий слой.

Никогда не наоборот.

## Что нельзя делать

- Не превращать интерфейс в тяжёлую CRM-таблицу.
- Не делать сайт похожим на дешёвый Canva/Lovable-шаблон.
- Не делать маркетинговую лендинг-страницу вместо рабочего экрана.
- Не делать всё фиолетовым: фиолетовый — акцент, а не атмосфера целиком.
- Не добавлять декоративные blob/orb-фоны и лишние иллюстрации в рабочие экраны.
- Не перегружать первый экран аналитикой, пока пользователь не создал продукты/контент/воронки.
- Не делать desktop-only интерфейс, который ломается в Telegram Mini App.
- Не добавлять пароли, SMS или другие лишние способы входа.
- Не ломать существующую бизнес-логику ради визуала.

## Границы дизайн-документации

Если задача просит добавить или обновить постоянные дизайн-инструкции:

- не менять страницы сайта;
- не менять бизнес-логику;
- не менять API;
- не менять базу данных;
- не менять текущие компоненты;
- не делать редизайн сейчас;
- менять только документацию и инструкции.

## Как работать

- Дизайн-изменения делать постепенно.
- Сначала обновлять или создавать изолированные компоненты.
- Не менять глобальные стили без необходимости.
- Использовать существующие Tailwind/shadcn/Radix/lucide-паттерны проекта.
- Любые новые правила интерфейса сверять с мобильной версией 360-430px.
- После работы запускать доступные проверки: `npm run build`, `npm run lint`, а для auth/backend — `node --check server/telegram-auth-server.mjs`.
- Не коммитить `dist`, если задача явно не просит собранные файлы.
- В конце писать отчёт: что изменено, какие файлы тронуты, какие проверки запущены.

## Текущий визуальный вектор

Compact creator SaaS / content-funnel workspace / Telegram Mini App utility.

Ключевые ощущения:

- светлый рабочий интерфейс;
- белые и почти белые поверхности;
- тонкие серо-лиловые линии;
- компактные поля, чипы и dropdown;
- спокойный фиолетовый акцент;
- понятная карта связей;
- меньше воздуха в мобильных формах;
- технические подписи тонким серым шрифтом;
- админский слой аккуратно и вторым планом.

## Технологии и ключевые зоны

- Frontend: Vite, React, TypeScript, React Router, Tailwind, shadcn/Radix, lucide-react.
- Backend: `server/telegram-auth-server.mjs`.
- Database: Prisma schema in `prisma/schema.prisma`.
- Auth: `src/lib/authContext.tsx`, `src/pages/Login.tsx`, `src/components/TelegramLoginButton.tsx`.
- Products: `src/pages/Products.tsx`, `src/components/products/*`.
- Content: `src/pages/Content.tsx`, `src/components/content/*`.
- Funnels: `src/pages/Index.tsx`, `src/components/funnels/*`.
- Admin: `src/pages/Admin.tsx`.

## Telegram Auth

Обязательное поведение:

- Telegram Mini App auth через `Telegram.WebApp.initData`;
- вход через Telegram-бота с одноразовым login token;
- session cookie через HMAC;
- `/api/auth/me`;
- `/api/auth/logout`;
- webhook с проверкой `TELEGRAM_WEBHOOK_SECRET`;
- сохранение `returnTo`;
- без паролей и SMS.

## Финальный отчёт

В конце design-doc-only задач нужно подтвердить:

1. Какие файлы созданы или обновлены.
2. Где лежат дизайн-инструкции.
3. Как Codex должен использовать их в следующих задачах.
4. Что страницы, компоненты, API и база данных не изменялись.
