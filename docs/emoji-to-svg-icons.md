# Emoji → SVG icons (premium polish)

Replaced hardcoded emoji used **as UI icons** with `lucide-react` SVG icons so
the product reads more premium and renders consistently across platforms
(emoji glyphs vary per OS/browser). Country flags and email templates were
intentionally left as emoji.

## What changed

### Alerts
- **`src/lib/alert-detectors.ts`** — stripped the leading emoji (🏆 🎯 🚀 ⏰ 🌍
  📱 🧹 💳) from every alert `title` string. The alerts page and the
  notification bell already render an SVG icon next to the title, so the emoji
  was redundant noise.
- **`src/lib/alerts.ts`** — removed the now-unused `emoji` field from
  `ALERT_LABELS` (it was dead code; the page used `meta.label` + an SVG icon).
- **`src/lib/alert-icons.ts`** (new) — single source of truth mapping each
  `AlertType` to its lucide icon. Shared by the alerts page and the bell.
- **`src/app/(dashboard)/dashboard/alerts/page.tsx`** — the local
  `CATEGORY_ICONS` map was replaced with an import of `ALERT_ICONS` from the
  shared file; unused icon imports were pruned.
- **`src/components/header/notification-bell.tsx`** — the plain severity dot is
  now an SVG icon (per alert type) inside a severity-tinted rounded square.

### Landing
- **`src/components/landing/Pricing.tsx`** — `★ Most Popular` → `<Star>` icon.
- **`src/components/landing/ProductBento.tsx`** — `★ winner` → `<Star>` icon.

### Dashboard
- **`src/app/(dashboard)/dashboard/collections/page.tsx`** — onboarding hint
  `📁 sub-folder` / `🔗 add link` → `<FolderPlus>` / `<Link>` icons.
- **`src/app/(dashboard)/dashboard/brain/page.tsx`** — action-result badge
  `✓ Action` / `✗ Failed` → `<Check>` / `<X>` icons.

## Intentionally left as emoji
- **Country flags** (`src/lib/countries.ts`, `LiveRouter.tsx`,
  `recent-activity.tsx`, `geo-breakdown.tsx`) — per-country SVGs are a separate,
  larger effort. The `🌐` unknown-country fallback stays too, since it sits in
  the flag column next to emoji flags and would look inconsistent as an SVG.
- **Email templates** (`src/lib/email.ts`, auth send-email) — SVG doesn't render
  reliably in email clients; emoji is the correct choice there.
- **`floating-chat.tsx`** — the `✓ <summary>` prefix is part of a streamed
  plain-text message string, not a rendered icon element. Converting it to SVG
  would require restructuring the chat message model (content is a single
  string). Left as-is; revisit if we split action summaries from streamed text.

## Verification
- `npx tsc --noEmit` — no type errors on the changed files.
- `npx eslint` on the changed files — no new errors introduced (the 3 remaining
  errors are pre-existing and unrelated: an `<a>`→`/pricing` link in brain, two
  `set-state-in-effect` in collections).
