# Compact back navigation

User request: remove the fixed mobile strip with the brand and training; add back navigation across workspace pages. Preserve other page design and functions.

- Deleted MobileHeader and its mobile spacing from all ten workspace pages.
- Added a 40px accessible arrow button in existing page headings, not another fixed bar. Existing fields, forms, cards, filters and typography remain unchanged.
- Workspace history is scoped to visited protected React Router entries. Fresh links and reloads fall back to Home; Back never intentionally returns to auth or an external referrer. Route replacements (consumed query parameters) do not add extra back steps.
- Calendar Back uses publication → day → month, then workspace history. Existing breadcrumbs remain available.
- Training is now accessible in Profile on mobile; desktop sidebar training remains. No feature deleted.
- No auth/backend/schema changes. Operator-only publication importer is not part of this frontend release; private content must not enter Git.

## Checks

TypeScript, production build and lint passed (0 errors; 16 existing warnings). Publication model tests 9/9. Browser tests cover back routes, fresh deep links, route history, calendar detail/day/month, training, no mobile strip, 320/390/430px; home navigation covers 320–1280px; publication regression covers copy, reversible published status, edits/save/reload and move. Fixtures are local, not production user data. Screenshots of Products and Content inspected at 430px.

## Self-review

- Brand/mood: 19/20 — existing project palette and compact style retained.
- Scenario clarity: 19/20 — explicit back affordance; predictable calendar hierarchy.
- Mobile/compactness: 19/20 — reclaimed 32px from strip, no new row, 40px tap area.
- UI consistency: 19/20 — shared lucide arrow, focus and hover states.
- Composition/adaptation: 18/20 — existing dense page layout preserved, verified narrow widths; real Telegram device check remains user-side.

Total: 94/100 self-review for this bounded change, not an overall app quality claim. `polina-brand-design` used subject to the more specific application rules and explicit no-redesign constraint.
