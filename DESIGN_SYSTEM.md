# Flow Forge 068 Design System

Документ для переноса визуального языка проекта в другой продукт. Основан на текущих токенах `src/index.css`, `tailwind.config.ts`, shadcn/ui-компонентах и фактических экранах приложения.

## 1. Product Vibe

Flow Forge 068 выглядит как легкий, аккуратный SaaS-инструмент для контент-стратегии, продуктовой линейки и воронок. Вайб: "рабочая доска для эксперта", где много маленьких сущностей, статусов и связей, но интерфейс не давит.

Ключевые ощущения:

- светлый, чистый, воздушный интерфейс;
- фиолетовый как главный брендовый акцент;
- плотные списки и рабочие таблицы вместо маркетинговых блоков;
- мягкие карточки, скругления, едва заметные тени;
- стеклянный sticky-header;
- ощущение современного no-code/SaaS продукта;
- friendly-but-productive: интерфейс должен помогать быстро раскладывать идеи, продукты, темы и контент.

Похоже на смесь:

- shadcn/ui admin dashboard;
- Linear по аккуратности навигации и плотности;
- Notion/ClickUp по рабочей структуре;
- легкий creator economy / marketing planner продукт;
- Lovable/Tailwind SaaS aesthetic: светлый фон, primary purple, rounded controls.

Важно: конкретных внешних референсов в коде нет. Фактически используются Tailwind, Radix/shadcn-паттерны, lucide-react icons и Lovable-стиль генерации.

## 2. Color System

Все основные цвета задаются через HSL CSS variables.

```css
:root {
  --background: 0 0% 98%;
  --foreground: 250 15% 15%;

  --card: 0 0% 100%;
  --card-foreground: 250 15% 15%;

  --popover: 0 0% 100%;
  --popover-foreground: 250 15% 15%;

  --primary: 258 90% 66%;
  --primary-foreground: 0 0% 100%;

  --secondary: 263 40% 96%;
  --secondary-foreground: 263 30% 40%;

  --muted: 250 10% 94%;
  --muted-foreground: 250 10% 50%;

  --accent: 271 81% 56%;
  --accent-foreground: 0 0% 100%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;

  --border: 250 10% 90%;
  --input: 250 10% 90%;
  --ring: 258 90% 66%;

  --amber: 38 92% 50%;
  --amber-foreground: 0 0% 0%;

  --violet-soft: 263 60% 97%;
}
```

Functional status colors:

```css
/* content statuses */
idea:        #94a3b8; /* slate */
in_progress:#f59e0b; /* amber */
ready:       #22c55e; /* green */
published:  #6366f1; /* indigo */

/* product type colors */
lead_magnet:  #8b5cf6;
tripwire:     #f59e0b;
mid_ticket:   #6366f1;
flagship:     #ef4444;
consultation: #22c55e;
private:      #0ea5e9;
```

Usage rules:

- Primary purple is for main actions, active nav, active tabs, links and selected states.
- Muted gray is for secondary text, counts, metadata and inactive controls.
- Amber is used sparingly for idea bank / in-progress / highlight states.
- Green only signals ready/active/success.
- Red only signals destructive or flagship/high-attention items.
- Do not make the whole UI purple. Purple is an accent, not the entire atmosphere.

## 3. Gradients

Brand/logo gradient:

```css
linear-gradient(135deg, #8B5CF6 0%, #A78BFA 30%, #7C3AED 60%, #6D28D9 100%)
```

Badge gradients:

```css
violet: linear-gradient(135deg, #8B5CF6, #7C3AED);
lilac:  linear-gradient(135deg, #A78BFA, #8B5CF6);
honey:  linear-gradient(135deg, #E8B66D, #D4A056);
amber:  linear-gradient(135deg, #D4A056, #C08B3F);
```

Hero/welcome gradient:

```css
bg-gradient-to-br from-purple-50 via-white to-indigo-50
```

Circuit/vertical connector:

```css
linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary) / 0.15))
```

Gradient rules:

- Use gradients for brand/logo, selected promotional buttons, small badges and top modal accents.
- Do not use heavy full-screen gradients inside the actual app workspace.
- The app screens should stay mostly `background/card/border` with purple highlights.

## 4. Typography

Fonts:

```css
body: Inter, system-ui, -apple-system, sans-serif;
logo: "Playfair Display", Georgia, serif;
```

Weights:

- 300/400 for body and secondary UI;
- 500 for controls and nav;
- 600 for section titles;
- 700 for strong headings and empty states;
- 800 for logo.

Typical font sizes:

```txt
Logo desktop: 20-22px
Logo mobile: 14px
Page title: 15-16px
Header meta/counts: 13px
Cards/list title: 12-14px
Dense cards desktop: 10-12px
Badges: 10-11px
Mobile tab label: 10px
Dropdown/menu items: 11-13px
Modal labels: 13px
Modal inputs: 15px
Hero H1 only on welcome: 30-60px responsive
```

Typography rules:

- Main app UI is compact. Avoid oversized dashboard headings.
- Use `tracking-tight` only for page headings; badges can use small uppercase tracking around `0.03em`.
- Body copy should be calm and utilitarian.
- Do not use decorative serif except for the `Content Map` logo.

## 5. Radius

Base radius:

```css
--radius: 1rem; /* 16px */
lg: var(--radius)
md: calc(var(--radius) - 4px) /* 12px */
sm: calc(var(--radius) - 8px) /* 8px */
```

Common component radii:

- cards/list rows: `rounded-2xl` or `var(--radius)`;
- buttons: `rounded-xl` in app-specific screens, `rounded-md` in generic shadcn button;
- small badges: `rounded-md`, `rounded-lg`;
- dropdowns: `rounded-xl`;
- modals: `rounded-3xl`;
- mobile nav tabs: `rounded-lg`.

Rule: the product uses soft rounded geometry, but not bubbly. Keep most repeated UI at 8-16px; reserve 24px+ for modals.

## 6. Shadows

Card shadows:

```css
--shadow-card:
  0 1px 3px 0 rgba(0, 0, 0, 0.04),
  0 4px 16px -2px rgba(0, 0, 0, 0.06);

--shadow-card-hover:
  0 2px 8px 0 rgba(0, 0, 0, 0.06),
  0 8px 24px -4px rgba(0, 0, 0, 0.08);
```

Modal shadow:

```css
0 24px 60px rgba(0, 0, 0, 0.15)
```

Dropdown shadow:

```css
0 12px 40px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)
```

Rules:

- Shadows are soft and functional.
- No harsh black shadows.
- Hover shadow is allowed on cards and primary CTA, but keep it subtle.

## 7. Spacing

Layout spacing:

- desktop page horizontal padding: `24px` (`md:px-6`);
- mobile page horizontal padding: `16px` (`px-4`);
- main vertical padding: `20-24px`;
- header height: `56px` mobile-ish, `64px` desktop;
- max content width: `1400px`;
- container padding from Tailwind config: `2rem`;
- mobile bottom padding: `pb-20` to avoid bottom nav.

Dense list spacing:

- list row padding: `px-3 py-1.5`;
- topic row padding: `px-3 py-2`, desktop `md:px-4`;
- list gap: `gap-0.5`;
- section divider rows: `pt-3 pb-1.5`;
- filter row gap: `gap-1.5` or `gap-2`.

Touch:

```css
@media (pointer: coarse) {
  button, [role="button"], input, select, textarea {
    min-height: 44px;
  }
}
```

Rule: desktop is dense and scannable; mobile gets larger tap targets without changing the product mood.

## 8. Glassmorphism / Surfaces

Glass surface:

```css
.surface-glass {
  background: hsl(var(--background) / 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
```

Used for sticky top headers and mobile nav-like surfaces.

Mobile bottom nav:

```css
bg-card/95 backdrop-blur-sm border-t border-border
```

Rules:

- Use glass only for persistent bars/headers over scrolling content.
- Keep blur minimal and practical.
- Do not use decorative glass panels everywhere.

## 9. UI Components

### Buttons

Base shadcn button:

```txt
inline-flex items-center justify-center gap-2
rounded-md text-sm font-medium
focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
```

Variants:

- default: `bg-primary text-primary-foreground hover:bg-primary/90`;
- secondary: `bg-secondary text-secondary-foreground hover:bg-secondary/80`;
- outline: `border border-input bg-background hover:bg-accent`;
- ghost: `hover:bg-accent`;
- destructive: `bg-destructive`;
- link: `text-primary underline-offset-4 hover:underline`.

App-specific primary actions:

```txt
inline-flex items-center gap-1.5 px-4 py-2
rounded-xl bg-primary text-primary-foreground
text-[13px] font-medium hover:bg-primary/90
transition-colors shadow-sm
```

Rules:

- Buttons often include lucide icons at `14-16px`.
- Primary action sits top-right in header.
- On mobile, hide long button text when needed, keep icon visible.

### Inputs

Base input:

```txt
h-10 w-full rounded-md border border-input bg-background
px-3 py-2 text-base md:text-sm
placeholder:text-muted-foreground
focus-visible:ring-2 focus-visible:ring-ring
disabled:opacity-50
```

Modal inputs often use:

```txt
px-4 py-3 rounded-xl border-[1.5px] text-[15px]
focus:border-primary
focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]
```

Rules:

- Labels are `13px`, semibold, muted.
- Input text on iOS must be at least `16px` to prevent zoom.
- Focus is soft ring, not heavy outline.

### Cards

Generic card:

```txt
rounded-lg border bg-card text-card-foreground shadow-sm
```

Elevated app card:

```css
.card-elevated {
  background: hsl(var(--card));
  box-shadow: var(--shadow-card);
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  transition: box-shadow 0.2s ease;
}
.card-elevated:hover {
  box-shadow: var(--shadow-card-hover);
}
```

List cards:

```txt
card-elevated flex items-center gap-2 px-3 py-1.5
cursor-pointer transition-all duration-200
hover:bg-[hsl(var(--primary)/0.04)]
```

Rules:

- Cards are mostly rows, not giant content blocks.
- Left accent border can mark expanded/idea states.
- Use status dots and badges to add information density.

### Badges / Pills

Common patterns:

```txt
text-[11px] px-1.5 py-0.5 rounded-lg font-normal
violet-surface text-primary

inline-flex items-center px-1.5 py-0.5 rounded-md bg-foreground/[0.06]

bg-primary/10 text-primary
```

Rules:

- Badges are tiny, readable, and operational.
- Use dots for status, icons for platform/product type.
- Active filters use soft violet surface.

### Sidebar

Desktop sidebar:

- fixed left rail via shadcn sidebar;
- background: `sidebar-background` / white;
- border-right: `border-border`;
- collapsible to icon mode;
- nav item: icon + label, 18-20px icon;
- active item: `bg-primary/10 text-primary`;
- inactive item: `text-muted-foreground hover:text-foreground hover:bg-muted/50`;
- nav row radius: `rounded-xl`;
- nav text: `12-14px`, medium.

Sidebar tokens:

```css
--sidebar-background: 0 0% 100%;
--sidebar-foreground: 250 10% 40%;
--sidebar-primary: 263 70% 50%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 263 40% 96%;
--sidebar-accent-foreground: 250 15% 15%;
--sidebar-border: 250 10% 90%;
--sidebar-ring: 263 70% 50%;
```

Mobile nav:

- bottom tabs, fixed;
- six main sections;
- icon above label;
- active item: `text-primary bg-primary/10`;
- height: `64px`;
- safe-area bottom enabled.

### Layout

Core app layout:

```txt
min-h-screen flex w-full bg-background
desktop: sidebar left, content right
mobile: fixed top mini header + fixed bottom nav
content: max-w-[1400px] mx-auto
sticky top header with surface-glass + border-b
```

Header structure:

- left: sidebar trigger + page title + count/meta;
- right: primary action button;
- optional second row for tabs/filters.

Main workspace:

- filters first;
- grouped rows/list;
- empty state centered with small icon, title, description, CTA.

## 10. Animation Style

Tailwind animations:

```ts
accordion-down: 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)
accordion-up:   0.3s cubic-bezier(0.2, 0.8, 0.2, 1)
fade-in:        0.3s ease-out, translateY(10px -> 0)
scale-in:       0.2s ease-out, scale(0.95 -> 1)
```

Interaction durations:

- most hover/focus transitions: `150-200ms`;
- modals: `200-300ms`;
- sidebar width: `200ms ease-linear`;
- onboarding delay: `600ms`;
- status pulse: Tailwind `animate-ping` for non-gray statuses.

Rules:

- Motion should feel quick and light.
- Use fade/slide/scale for popovers and modals.
- Do not add bouncy, playful, or slow animations.
- Status animation is functional: only active non-gray dots pulse.

## 11. Mobile Style

Mobile is not a separate visual identity. It is the same dense product adjusted for touch.

Rules:

- top header fixed, compact, `h-8`;
- bottom nav fixed, `h-16`;
- main content starts with `pt-8` and ends with `pb-20`;
- hide desktop sidebar on `< md`;
- shorten labels/buttons where needed;
- icon sizes around `20px`;
- tab labels around `10px`;
- minimum touch target `44px` for coarse pointers;
- prevent horizontal overflow with `overflow-x: hidden`;
- inputs at `16px` on iOS to avoid zoom.

## 12. Dark / Light Logic

Tailwind is configured with:

```ts
darkMode: ["class"]
```

But the current CSS defines only `:root` light variables. There is no implemented `.dark { ... }` token set in the project.

Current rule:

- treat the product as light-first;
- all components should use semantic tokens (`background`, `foreground`, `card`, `muted`, `border`, `primary`) so dark mode can be added later;
- do not hardcode too many light grays in new components;
- if dark mode is needed, add a complete `.dark` block for every token before enabling a toggle.

Suggested dark mode direction if another project needs it:

```css
.dark {
  --background: 250 20% 8%;
  --foreground: 250 15% 96%;
  --card: 250 18% 11%;
  --card-foreground: 250 15% 96%;
  --muted: 250 12% 18%;
  --muted-foreground: 250 8% 68%;
  --border: 250 12% 22%;
  --input: 250 12% 22%;
  --primary: 258 90% 70%;
  --ring: 258 90% 70%;
}
```

Only add this after testing contrast and shadows.

## 13. Design Philosophy

The product is a working system, not a landing page. The design should prioritize:

- scanning many small items quickly;
- seeing status at a glance;
- low-friction creation/editing;
- predictable navigation;
- compact hierarchy;
- calm backgrounds with meaningful accents;
- operational clarity over decorative storytelling.

The UI tone:

- helpful;
- modern;
- calm;
- creator-friendly;
- structured;
- slightly premium through softness and spacing, not through heavy visuals.

Copy tone:

- short labels;
- action-oriented buttons;
- friendly empty states;
- no corporate jargon;
- avoid long explanatory text inside the app workspace.

## 14. Rules That Must Not Be Broken

- Do not replace the light SaaS workspace with a dark, dramatic, neon, cyber, or heavy editorial style.
- Do not turn every section into large marketing cards. The app needs dense lists and operational surfaces.
- Do not overuse gradients. Gradients belong to logo, small badges, and occasional primary/hero CTA.
- Do not make purple dominate every background. Use it for active/selected/primary.
- Do not remove status dots, badges, icons, or counts; they are core to scanability.
- Do not use large hero typography inside dashboard pages.
- Do not make mobile a simplified landing page; keep the actual product visible.
- Do not use harsh borders or heavy black shadows.
- Do not add large decorative blobs/orbs to the app workspace.
- Do not mix many typefaces. Inter is the UI font; Playfair is logo-only.
- Do not ignore safe area and bottom navigation padding on mobile.
- Do not hardcode colors where semantic tokens can be used.
- Do not enable dark mode without defining a full `.dark` token system.

## 15. Quick Implementation Checklist

When recreating this system in another project:

1. Install/use Tailwind with shadcn-compatible CSS variables.
2. Import Inter and Playfair Display.
3. Copy the `:root` tokens from section 2.
4. Extend Tailwind colors with semantic tokens from `tailwind.config.ts`.
5. Add `card-elevated`, `surface-glass`, `violet-surface`, `logo-gradient`, `safe-area-bottom`.
6. Use lucide icons for navigation and actions.
7. Build layout as sidebar + sticky header + dense lists.
8. Keep primary actions in the header.
9. Use bottom mobile nav below `md`.
10. Test desktop and mobile density before adding decorative visuals.

