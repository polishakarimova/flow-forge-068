# Karta Kontenta Component Map

This map shows where to make common product and UI changes.

## App Shell

- Routes: `src/App.tsx`
- Desktop sidebar: `src/components/AppSidebar.tsx`
- Mobile top/bottom navigation: `src/components/MobileNav.tsx`
- Global styles/tokens: `src/index.css`
- Tailwind tokens: `tailwind.config.ts`

## Auth

- Frontend auth context: `src/lib/authContext.tsx`
- Login page: `src/pages/Login.tsx`
- Telegram button: `src/components/TelegramLoginButton.tsx`
- Backend auth/API server: `server/telegram-auth-server.mjs`
- Prisma auth models: `prisma/schema.prisma`
- Env instructions: `TELEGRAM_AUTH_SETUP.md`

Key endpoints:

- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/telegram-mini-app`
- `POST /api/auth/telegram-login-token`
- `GET /api/auth/telegram-login-token/:token`
- `POST /api/telegram/webhook`

## Data Stores

- Main app data: `src/lib/dataStore.tsx`
- Context/profile data: `src/lib/contextStore.tsx`
- Product seed/types: `src/lib/productData.ts`
- Content seed/types: `src/lib/contentData.ts`
- Funnel seed/types: `src/lib/funnelData.ts`

Current persisted app groups:

- products;
- formats;
- topics;
- content items;
- keywords;
- funnels;
- expert/context data.

## Products

- Page: `src/pages/Products.tsx`
- Create modal: `src/components/products/CreateProductModal.tsx`
- Edit modal: `src/components/products/EditProductModal.tsx`
- Product card: `src/components/products/ProductCard.tsx`
- Type selector: `src/components/products/ProductTypeSelector.tsx`
- Type icon: `src/components/products/ProductTypeIcon.tsx`
- Format selector: `src/components/products/FormatSelector.tsx`
- Status selector: `src/components/products/ProductStatusSelect.tsx`
- Status dot: `src/components/products/StatusDot.tsx`

Design notes:

- Keep filters and form inputs compact.
- Product type chips are the reference style for similar chip groups.
- User-created product types must persist and be removable with confirmation.

## Content

- Page: `src/pages/Content.tsx`
- Create topic modal: `src/components/content/CreateTopicModal.tsx`
- Edit idea modal: `src/components/content/EditIdeaModal.tsx`
- Detail modal: `src/components/content/ContentDetailModal.tsx`
- Content card: `src/components/content/ContentCard.tsx`
- Topic row: `src/components/content/TopicRow.tsx`
- Platform selector: `src/components/content/PlatformSelector.tsx`
- Platform icon: `src/components/content/PlatformIcon.tsx`
- Status selector: `src/components/content/StatusSelect.tsx`
- Dropdowns: `src/components/content/ContentDropdown.tsx`, `src/components/content/ContentMultiDropdown.tsx`

Design notes:

- Platform chips should match product type chips.
- `Куда постим?` should support gear/check edit mode when platform editing is available.
- Missing title/platform validation should mirror product modal validation.

## Funnels

- Page/list: `src/pages/Index.tsx`
- Create/edit modal: `src/components/funnels/CreateFunnelModal.tsx`
- Path row: `src/components/PathRow.tsx`
- Funnel map: `src/components/FunnelMap.tsx`
- Map page: `src/pages/FunnelMapPage.tsx`

Design notes:

- Keyword picker must be compact.
- Product steps should be visually separated as blocks.
- Keyword add/delete should persist and require confirmation on delete.

## Calendar

- Page: `src/pages/Calendar.tsx`

Calendar connects planned content and product dates. Keep date cells compact on mobile.

## Context

- Page: `src/pages/ContextPage.tsx`

Context screens collect expert, niche, audience, references, and source material information. They should stay practical and dense.

## Profile

- Page: `src/pages/Profile.tsx`

Profile should show account/session state and app preferences without exposing technical auth internals.

## Admin

- Page: `src/pages/Admin.tsx`

Admin should eventually be backed by real API data:

- users;
- Telegram accounts;
- login identities;
- app state counts;
- broadcasts;
- basic system health.

Avoid adding more fake metrics. Prefer empty connected sections over decorative mock data.

## Shared UI Primitives

shadcn/Radix primitives live in:

- `src/components/ui/*`

Use them for dialogs, buttons, inputs, selects, popovers, drawers, checkboxes, tabs, and tooltips. Keep app-specific styling in feature components when the primitive is generic.
