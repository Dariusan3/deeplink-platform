# Partner pages — mobile responsiveness fix

## Problem

Partner dashboard had **no navigation on mobile**. The layout rendered the
sidebar with `hidden md:flex` and put nothing in its place below 768px — so on
a phone there was no way to move between Overview, Referrals, Earnings, etc.
Individual partner pages were already responsive (`grid-cols-1 md:...`, tables
wrapped in `overflow-x-auto`); the shell was the gap.

Secondary: the Settings crypto-network picker used a fixed `grid-cols-3`, which
squeezed labels like "USDT (TRC20)" on narrow screens.

## Fix

**New component** — `src/components/partner/partner-mobile-nav.tsx`
- Sticky top bar (`md:hidden`) with the Tappr Partner logo and a hamburger.
- Hamburger opens `PartnerSidebar` as a slide-over drawer over a dimmed backdrop.
- Auto-closes on route change (tapping a nav link dismisses it), on `Escape`,
  and on backdrop tap. Locks body scroll while open. Reuses the existing
  `PartnerSidebar` verbatim, so desktop and mobile share one nav source.

**`src/app/partner/layout.tsx`**
- Desktop sidebar unchanged (`hidden md:flex`).
- Main column now wraps `<PartnerMobileNav />` above `<main>` in a flex column,
  so the mobile bar sits in flow and content starts below it.

**`src/app/partner/settings/page.tsx`**
- Network picker `grid-cols-3` → `grid-cols-2 sm:grid-cols-3` so wallet-network
  labels fit on small phones.

## Verification

Rendered the partner shell in a throwaway unguarded harness route (the real
`/partner` is behind a `is_partner` middleware gate) and drove it with a headless
browser at 375×812 and 1280×800:

- **375px** — top bar + hamburger visible, desktop sidebar width `0` (hidden),
  no horizontal overflow (`scrollWidth == innerWidth == 375`).
- **Drawer** — opens with all 7 nav links, 256px panel, closes on backdrop tap.
- **1280px** — hamburger hidden, sidebar shown at 256px.

Typecheck clean. No console errors beyond React devtools/HMR notices.
