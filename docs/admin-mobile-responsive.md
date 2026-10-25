# Admin panel: mobile responsive pass

## Problem
On iPhone (16 Pro Max, ~440px wide) the admin panel was unusable: the shell had a
fixed `w-64` sidebar that never collapsed, so the content got ~180px. Pages used
`p-8`, rows were single-line flex with `shrink-0` action clusters, and the
Create/Grant dialogs could overflow the viewport height.

## Changes
- `src/components/admin/admin-shell.tsx`: below `md` the sidebar is hidden and a
  sticky top bar shows the brand, a "Dashboard" link and a horizontally
  scrollable nav (respects the iOS safe area). `md+` is unchanged. Content area
  got `min-w-0` so wide children can't push the layout.
- `src/components/ui/page-header.tsx`: title `text-2xl sm:text-3xl` (shared by
  partner pages too, small visual change on phones only).
- Overview: `p-4 md:p-8`, tighter stat cards (`text-2xl` value on phones).
- Users: rows stack vertically below `lg`; badge/action buttons wrap; emails
  `break-all`; Grant / Set Password / Create dialogs get `max-h-[90dvh]` +
  scroll.
- Subscriptions: filter tabs wrap, rows stack below `sm`, long team/email text
  wraps.
- Payouts: filter pill row scrolls horizontally, wallet button full width,
  tx-hash input on its own line below `sm`.
- Activity: filters stack (search/severity full width, From/To side by side),
  event meta wraps, KV values `break-all` instead of truncating.
- Grant plan dialog: `90vh` -> `90dvh` so the iOS URL bar doesn't clip it.

## Not verified in a real browser
Checked with `tsc` only. Verify on device or DevTools at 430px:
all 5 admin pages, plus open each dialog.
