# Karta Kontenta UI Rules

## Global Layout

- Build real app screens, not landing sections.
- Use full-width workspace layouts with constrained content where needed.
- Keep headers sticky and quiet.
- Avoid nesting cards inside cards.
- Avoid giant page spacing in app flows.
- Keep desktop useful, but optimize first for 360-430px mobile width.

## Density

Controls should be compact.

Recommended mobile heights:

- text input: 42-48px;
- compact select/filter: 38-44px;
- chips: 30-36px;
- dropdown option: 36-42px;
- list row in picker: 42-52px;
- modal vertical section gap: 14-18px.

Avoid controls where the top/bottom padding is visually larger than the text itself.

## Forms

- Labels sit close to their controls.
- Required missing fields should be softly highlighted after the user tries to submit.
- Disabled submit buttons should still communicate what is missing after tap/click.
- Placeholder text should be gray, regular weight, and technical.
- Do not show long helper text unless it prevents a real mistake.

Validation:

- Use soft red/lilac focus styling, not harsh blocks.
- Highlight the exact missing group: product type, format, title, platform, keyword, etc.
- Add one concise helper line only when needed.

## Chips And Pills

Use chips for:

- product types;
- content platforms;
- statuses;
- selected filters;
- small selectable categories.

Chip rules:

- compact padding;
- border radius around 10-14px, not huge bubble shapes;
- icon size 12-14px;
- label size 11-13px;
- selected chip gets purple border/background;
- unselected chip stays white/gray.

When a chip group is editable:

- put a small gear icon beside the section label;
- gear changes to a check icon in edit mode;
- delete icons appear only in edit mode;
- destructive delete requires confirmation;
- add control appears as a compact dashed/soft row or small plus chip.

## Dropdowns

Dropdowns must never create horizontal scrolling.

Rules:

- menu width must fit the trigger or viewport;
- options are compact and left-aligned;
- no separate phrase like `Выберите слово...` inside a keyword menu if the label already explains the field;
- add-new row uses thinner gray placeholder text;
- plus button is square/circle and stays inside the menu bounds;
- selected rows may use soft lilac background, but not a tall oversized block.

## Product Creation

Product creation needs:

- title;
- product type;
- format;
- price/status/date/link as compact fields.

Product type editor:

- section title `Тип продукта` with a small gear beside it;
- in edit mode, gear becomes check;
- chips become removable;
- add type chip/row appears at the end;
- deletion asks for confirmation.

Keep product type chips compact and consistent across product cards, filters, and modals.

## Funnel Creation

Funnels are built from:

- keyword;
- optional product steps;
- content items.

Each product step should read as its own block:

- lead magnet;
- tripwire;
- mid-ticket;
- flagship;
- consultation/private work.

Do not let all funnel fields become one long text sheet. Use thin bordered blocks with compact padding.

Keyword picker:

- no extra `Выберите слово...` phrase in the open menu;
- selected keyword row height should be compact;
- add keyword row uses `Новое слово...`;
- delete keyword requires confirmation.

## Content Creation

Content creation needs:

- topic/title;
- content body or structure;
- posting platforms.

Platform chips should visually match product type chips:

- same density;
- same font rhythm;
- same edit behavior;
- gear beside `Куда постим?`;
- add/delete platform in edit mode.

If the user taps disabled `Создать тему`, highlight missing title/platforms the same way product creation does.

## Admin Panel

Admin is an operational screen, not a demo page.

It should show:

- users;
- auth/provider info;
- app data counts;
- broadcasts/notifications if implemented;
- system status where useful.

Avoid fake-looking metrics if real API data is available. If a section is not wired, mark it clearly as empty or not connected.

## Icons

Use `lucide-react`.

Preferred icons:

- settings: `Settings2` or `Settings`;
- confirm edit: `Check`;
- add: `Plus`;
- delete: `Trash2`;
- close: `X`;
- Telegram/send: `Send`;
- search: `Search`;
- dropdown: `ChevronDown` / `ChevronUp`.

Do not use text buttons where a familiar icon button is clearer.
