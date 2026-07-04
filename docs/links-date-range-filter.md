# Links Page — Date Range Filter

## What changed
The "Older than" filter on the Links page was a single-date picker that showed
every link created *before* the chosen day. It's now a **date range picker**
labelled **"Created between"** that shows links created **within** the selected
interval (inclusive of both endpoints).

## Why
Users wanted to inspect links created inside a specific window (e.g. "everything
from last month") rather than only an open-ended "older than X" cutoff.

## Implementation
- Reused the existing [`DateRangePicker`](../src/components/ui/date-picker.tsx)
  component (two-month calendar + preset rail: Today, Last 7 Days, This Month,
  Last Month, etc. + Custom Range with Apply/Clear).
- [`link-list.tsx`](../src/components/links/link-list.tsx): replaced the
  `dateFilter: string` state with `dateRange: { from: string; to: string }`.
  Filtering keeps links whose `created_at` falls in
  `[from 00:00:00, to 23:59:59.999]`; each bound is optional.
- [`link-toolbar.tsx`](../src/components/links/link-toolbar.tsx): swapped the
  `DatePicker` for `DateRangePicker`, renamed the props to
  `dateRange` / `onDateRangeChange`, and updated the label to "Created between".
  Reset-filters and the active-filter indicator now account for both `from`
  and `to`.

## Notes
- Dates are compared in local time (`from + "T00:00:00"`), consistent with the
  picker's `toLocalIsoDate` helper — no UTC drift for users east of UTC.

## Related fix — link-card hydration mismatch
While testing the Links page a React hydration error surfaced in
[`link-card.tsx`](../src/components/links/link-card.tsx) (unrelated to the date
filter). `buildShortUrl()` reads `window.location` on the client but falls back
to the production host during SSR, so the server rendered
`https://tappr.me/<slug>` while the client's first render wanted
`http://localhost:3000/<slug>`.

Fixed with a new [`useShortUrl`](../src/hooks/use-short-url.ts) hook: it returns
the SSR fallback (`https://tappr.me/<slug>`) on the first client render so
hydration matches, then swaps in the real window-derived URL after mount.
`link-card.tsx` now uses this hook instead of calling `buildShortUrl` directly.
