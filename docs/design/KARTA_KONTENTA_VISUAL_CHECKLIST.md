# Karta Kontenta Visual Checklist

Use this checklist before finishing visual/UI work.

## Mobile First

- Checked at 360px width.
- Checked at 390-430px width.
- Checked inside a short viewport with keyboard/open modal if the changed screen has inputs.
- No horizontal scroll in the page, dropdown, modal, or picker.
- Bottom navigation does not cover primary actions.
- Telegram Mini App header area does not collide with page content.

## Compactness

- Inputs are not taller than needed.
- Dropdown rows are compact.
- Chips do not look like oversized bubbles.
- Labels sit close to controls.
- Empty space does not dominate short text.
- Lists show enough items without endless scrolling.

## Consistency

- Product type chips, content platform chips, filters, and selectable statuses use one shared visual rhythm.
- Edit controls use the same gear/check pattern.
- Add rows use the same plus pattern.
- Delete always has confirmation for user-defined items.
- Placeholder and technical text use the same gray, thin style.

## Readability

- Text does not overlap with icons or neighboring controls.
- Long Russian labels wrap or truncate gracefully.
- Buttons keep labels inside their bounds.
- Font sizes match the component scale.
- Disabled states are visible but still readable.

## States

For every changed interactive component, check:

- default;
- hover/focus where relevant;
- selected;
- disabled;
- loading;
- empty state;
- validation error;
- edit mode if available.

## Forms

- Tapping/clicking disabled submit reveals missing fields.
- Missing fields are highlighted softly and specifically.
- Error text is short.
- Successful auth/save/create flow returns the user to the expected screen.

## Auth

- Browser Telegram login opens the bot.
- Telegram Mini App auth uses `initData`.
- Returning from bot with `telegramLoginToken` completes login.
- `/api/auth/me` returns the correct user or `null`.
- `/api/auth/logout` clears session.

## Final Checks

Run:

```bash
npm run build
npm run lint
```

For auth/backend changes:

```bash
node --check server/telegram-auth-server.mjs
npx prisma generate
```

Do not leave generated `dist` files in the commit unless explicitly requested.
