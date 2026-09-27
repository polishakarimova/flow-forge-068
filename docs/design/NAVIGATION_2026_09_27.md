# Navigation-only home integration

## Scope and preservation contract

Approved: reorganize entry points and add the selected compact Home screen.
Explicit constraint: preserve every existing page, its design, density, fields, editors and functionality. No color changes were needed. No dependency, global CSS, backend, database, or content migration changes.

- `/home`: authenticated landing, today's publications, optional resume, profile, shortcuts into existing idea/publication forms, context and products.
- Mobile: Home / Content / Calendar / Sales, using the existing 64px navigation height and appearance.
- Sales opens a small navigation sheet to existing `/products`, `/dashboard`, `/map`. This deliberately avoids adding a new permanent toolbar that would reduce usable space in the original pages.
- Desktop: existing sidebar retained, reordered, Home added. All previous destinations remain.
- Existing routes continue working, including `/calendar?view=legacy`, profile, context, training and admin.
- Restored sessions skip Welcome; explicit `returnTo` still wins over the new default `/home`. While checking the session, show a neutral loading state, not a flashing Welcome.

## Files

New: `Home.tsx`, `SalesNavigation.tsx`, `usePublicationOverview.ts`, navigation E2E test.
Edited: app route table, mobile/sidebar navigation, auth destination, Welcome redirect, navigation-only entry effects in Content and Publications, auth E2E expected default destination.

The return markup of Content and Publications is identical to the previous release. Product, funnel, map, context, profile, legacy calendar pages and all editor components remain unchanged. A source-preservation assertion compares these against baseline commit `eb7be364db75018e562f5e7af6c56097060e972d`.

## Data boundaries

Home reads publications only. It does not call the calendar write hook, flush drafts, import content, or alter revisions. It can preview a valid local draft under the authenticated user's key, with a notice directing the user to the calendar to confirm saving. Existing main/context providers still perform their pre-existing hydration autosave; that behavior is not modified or represented as a new Home write.

Home query links select an existing day/item or open an existing form; query actions are consumed with history replacement. Resume uses existing user-scoped view memory. Home contains no demo content or fabricated counts. If loading fails, say so instead of presenting an empty day as authoritative.

Old Content and new Publications remain separate stores. This change does not introduce synchronization between them. No personal story plan was imported.

## Verification

- TypeScript: passed.
- Production build: passed; existing bundle-size/Browserslist notices remain.
- ESLint: 0 errors, 16 pre-existing warnings; no additional warnings.
- Existing Vitest smoke: 1 passed.
- Calendar model / Telegram polling node tests: 10 passed.
- Auth E2E: first tap, failure sanitation, protected routes including Home, blocked browser popup, restored routes, logout, mobile sizing and reduced motion passed.
- Navigation E2E: preservation assertions, session restore without Start, four tabs, read-only publication overview, resume, five day items, existing idea form, all sales pages, profile, add-publication form, legacy calendar, load-error state, 320/360/390/430/1280px passed.
- Calendar E2E: five formats, copy, reversible double tap, edit/save/reload, move across months, 320/390px passed.
- Headless browser tests use isolated fixtures, not production sessions or user data.

## Design review

Only the new Home and navigation are scored; this is not a redesign score for existing pages.

- Brand / mood 18/20: reuse current colors, type and primitives, no decorative new theme.
- Scenario clarity 18/20: direct everyday actions, Sales grouping understandable; one extra tap to choose a sales page is the deliberate cost of preserving page space.
- Mobile / compactness 19/20: four touch targets, unchanged nav height, no page-level toolbar, narrow-screen checks.
- UI consistency 19/20: existing forms and layouts unchanged, Radix sheet for new navigation.
- Composition / responsive 18/20: compact Home, real empty/loading/error states; actual Telegram device verification still desirable.

Total: 92/100 self-review, not a measured user score. New Home uses the personal brand skill only where compatible with the product-specific design rules and the explicit request not to restyle existing pages.

## Release

Prepared as a separate change for review. Main merge triggers production deployment, so do not merge or manually deploy without the user's release approval. No production writes or server changes were performed for this implementation.
