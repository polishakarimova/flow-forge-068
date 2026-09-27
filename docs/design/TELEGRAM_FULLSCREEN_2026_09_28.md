# Telegram fullscreen and quieter headers

Requested from annotated mobile screenshots: remove Home back arrow, date and extra Calendar link; remove persistent Saved label and file transfer icons from the calendar header. Preserve other page design and functions.

Implemented:
- Home header: greeting/profile only. Today header has no extra link; bottom plan link and normal calendar navigation remain.
- Calendar header: Back and Plus only. Saved success is quiet; pending/error/conflict status and recovery controls remain. Import/export relocated to collapsed File operations below the month grid.
- SDK startup calls ready/expand, then requests fullscreen once for API 8.0+. No request in a normal browser; older clients retain expand fallback. SDK failures do not break rendering; user fullscreen exits are not overridden.
- Telegram-only safe-area CSS updates from system/content insets and stable viewport; accounts for sticky headers, bottom tabs, page height, dialog bounds and changes in orientation/fullscreen. No orientation locks or swipe disabling.
- Authentication, data stores and source content unchanged. No native fullscreen on a real iPhone claimed until user verification.

Official source: https://core.telegram.org/bots/webapps (expand, requestFullscreen, safeAreaInset, contentSafeAreaInset, events). SDK already loaded synchronously in index.html before app startup.

Checks: TypeScript, build, lint (0 errors/16 pre-existing warnings), 5 viewport unit tests, fullscreen/browser fixtures including safe areas and failure status, narrow widths 320/360/390/430, dialog boundaries; existing home/back/publication browser regressions. Screenshots inspected. No production fixture writes.

Self-review: brand 19/20, clarity 19/20, mobile compactness 18/20, UI consistency 19/20, composition/adaptation 18/20 = 93/100. Real-device Telegram behavior is pending, so no guarantee of fullscreen on every client. `polina-brand-design` constrained by application-specific compact UI and user's no-redesign request.
