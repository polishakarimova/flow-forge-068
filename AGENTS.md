# Karta Kontenta Agent Guide

This repository is the `Karta Kontenta` / `Content Map` service for building product lines, content plans, CTA keywords, funnels, a visual funnel map, and a publishing calendar.

## Product Rules

- Treat the app as a working SaaS tool, not a landing page.
- The main user flow is: Context -> Products -> Content -> Funnels -> Map -> Calendar.
- The interface must stay compact, especially inside Telegram Mini App on mobile.
- Users should not have to understand technical deployment, database, or Telegram auth details.
- Do not add password, SMS, or unrelated auth flows. Telegram auth is the primary auth.
- Persist user data through the backend API and PostgreSQL/Prisma models, not through new local-only storage.

## Codebase

- Frontend: Vite, React, TypeScript, React Router, Tailwind, shadcn/Radix primitives, lucide-react.
- Backend: `server/telegram-auth-server.mjs`.
- Database layer: Prisma schema in `prisma/schema.prisma` plus existing server API routes.
- Main app state: `src/lib/dataStore.tsx` and `src/lib/contextStore.tsx`.
- Auth context: `src/lib/authContext.tsx`.
- Product UI: `src/pages/Products.tsx` and `src/components/products/*`.
- Content UI: `src/pages/Content.tsx` and `src/components/content/*`.
- Funnel UI: `src/pages/Index.tsx` and `src/components/funnels/*`.
- Admin UI: `src/pages/Admin.tsx`.

## Design Source Of Truth

Before making visual changes, read:

- `docs/design/KARTA_KONTENTA_BRAND_GUIDE.md`
- `docs/design/KARTA_KONTENTA_UI_RULES.md`
- `docs/design/KARTA_KONTENTA_VISUAL_CHECKLIST.md`
- `docs/design/KARTA_KONTENTA_COMPONENT_MAP.md`

Existing legacy references:

- `DESIGN_SYSTEM.md`
- `SERVICE_STRUCTURE.md`
- `TELEGRAM_AUTH_SETUP.md`

## UI Priorities

- Mobile first: check narrow screens around 360-430px width.
- Dense controls: inputs, dropdowns, chips, and list rows should not have excessive vertical padding.
- Use gray technical text for placeholders, helper text, optional labels, metadata, and empty states.
- Use purple only for primary actions, selected states, and small accents.
- Avoid huge cards, oversized headings, nested cards, and decorative empty space in working screens.
- Do not add explanatory marketing text inside core app workflows.
- Use lucide icons for icon buttons, compact controls, settings, delete, confirm, and add actions.

## Telegram Auth

Required behavior:

- Telegram Mini App auth through `Telegram.WebApp.initData`.
- Browser login through bot login token.
- Session cookie signed by HMAC.
- `/api/auth/me` and `/api/auth/logout`.
- Webhook protected by `TELEGRAM_WEBHOOK_SECRET`.
- Preserve `returnTo`.
- No passwords and no SMS.

If auth breaks, first inspect:

- `src/lib/authContext.tsx`
- `src/pages/Login.tsx`
- `src/components/TelegramLoginButton.tsx`
- `server/telegram-auth-server.mjs`
- `prisma/schema.prisma`

## Verification

Run the smallest useful checks for the change:

```bash
npm run build
npm run lint
node --check server/telegram-auth-server.mjs
```

For Prisma/auth changes also run:

```bash
npx prisma generate
```

Do not commit `dist` changes unless the task explicitly asks for built assets.
