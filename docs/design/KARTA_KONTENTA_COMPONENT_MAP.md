# Karta Kontenta Component Map

## Recommended Hierarchy

1. Product/content/funnel workflow first.
2. Mobile Telegram Mini App experience second.
3. Map/calendar visualization third.
4. Admin and system management last.

Админка не должна задавать основной визуальный стиль продукта.

## App Shell

- Routes: `src/App.tsx`
- Desktop sidebar: `src/components/AppSidebar.tsx`
- Mobile navigation: `src/components/MobileNav.tsx`
- Global styles: `src/index.css`
- Tailwind tokens: `tailwind.config.ts`

## Auth

- Auth context: `src/lib/authContext.tsx`
- Login page: `src/pages/Login.tsx`
- Telegram button: `src/components/TelegramLoginButton.tsx`
- Backend auth server: `server/telegram-auth-server.mjs`
- Prisma models: `prisma/schema.prisma`
- Env/setup docs: `TELEGRAM_AUTH_SETUP.md`

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
- Product data/types: `src/lib/productData.ts`
- Content data/types: `src/lib/contentData.ts`
- Funnel data/types: `src/lib/funnelData.ts`

Persisted groups:

- products;
- formats;
- topics;
- content items;
- keywords;
- funnels;
- expert/context data.

## Product Components

- Page: `src/pages/Products.tsx`
- Create modal: `src/components/products/CreateProductModal.tsx`
- Edit modal: `src/components/products/EditProductModal.tsx`
- Product card: `src/components/products/ProductCard.tsx`
- Type selector: `src/components/products/ProductTypeSelector.tsx`
- Type icon: `src/components/products/ProductTypeIcon.tsx`
- Format selector: `src/components/products/FormatSelector.tsx`
- Status selector: `src/components/products/ProductStatusSelect.tsx`
- Status dot: `src/components/products/StatusDot.tsx`

Recommended extracted patterns:

- `ProductTypeChip`
- `ProductTypeEditor`
- `ProductFormatDropdown`
- `ProductMissingFieldHint`
- `CompactFilterSelect`

Design notes:

- Product type chips are the reference for other chip groups.
- User-created product types must persist.
- Delete must require confirmation.
- Filters must stay compact on mobile.

## Content Components

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

Recommended extracted patterns:

- `PlatformChip`
- `PlatformEditor`
- `ContentMissingFieldHint`
- `CompactContentPicker`

Design notes:

- Platform chips should match product type chips.
- `Куда постим?` should support the same gear/check edit mode.
- Missing title/platform validation should mirror product modal validation.

## Funnel Components

- Page/list: `src/pages/Index.tsx`
- Create/edit modal: `src/components/funnels/CreateFunnelModal.tsx`
- Path row: `src/components/PathRow.tsx`
- Funnel map: `src/components/FunnelMap.tsx`
- Map page: `src/pages/FunnelMapPage.tsx`

Recommended extracted patterns:

- `KeywordPicker`
- `KeywordEditorRow`
- `FunnelStageBlock`
- `FunnelContentPicker`
- `FunnelMissingFieldHint`

Design notes:

- Keyword picker must be compact.
- Product stages should be visually separated as blocks.
- Keyword add/delete should persist.
- Keyword delete requires confirmation.

## Calendar

- Page: `src/pages/Calendar.tsx`

Calendar connects planned content and product dates. Keep date cells compact on mobile.

## Context

- Page: `src/pages/ContextPage.tsx`

Context screens collect expert, niche, audience, references, and source material information. They should stay practical and dense.

## Profile

- Page: `src/pages/Profile.tsx`

Profile should show account/session state and preferences without exposing technical auth internals.

## Admin

- Page: `src/pages/Admin.tsx`

Recommended admin components:

- `AdminUserList`
- `AdminMetricStrip`
- `AdminAuthIdentityRow`
- `AdminBroadcastPanel`
- `AdminSystemStatus`

Admin should be backed by real API data when possible:

- users;
- Telegram accounts;
- login identities;
- app state counts;
- broadcasts;
- system health.

Avoid fake metrics. Prefer empty connected sections over decorative mock data.

## Shared UI Primitives

shadcn/Radix primitives live in:

- `src/components/ui/*`

Use them for dialogs, buttons, inputs, selects, popovers, drawers, checkboxes, tabs, and tooltips.

Keep app-specific styling in feature components when the primitive is generic.
