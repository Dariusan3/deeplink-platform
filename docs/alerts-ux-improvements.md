# Alerts page — UI/UX improvements

Date: 2026-07-04. A navigability pass on `/dashboard/alerts` guided by the
`frontend-design` skill (hierarchy, colour discipline, motion on key moments).
The page was clean at low volume but a long, unfilterable vertical stack at high
volume. All changes are in [alerts/page.tsx](../src/app/(dashboard)/dashboard/alerts/page.tsx).

## What changed

1. **Tier chips are now filters.** The four tier cards (Critical / Opportunities /
   Strategic / Operational) were dead stat cards with a clickable *look* (false
   affordance). They now filter the list — click a tier to narrow, click again to
   reset — with the active tier highlighted (`aria-pressed`).

2. **Filter bar.** Added search + a severity segmented control (All / High / Med /
   Low) + a status control (All / To review / Verified) + a "Clear" button and a
   "N of M" count. A reusable `Seg` segmented-control component backs both toggles.
   Filtering is a pure `filtered` derivation; chip counts stay on the full set.

3. **Metrics collapsed by default.** The `MetricsDashboard` was a large always-open
   block between the hero and the alerts, pushing content down. It's now inside a
   collapsible "Detector metrics" panel (closed by default), and moved below the
   filter bar so the actual alerts sit higher.

4. **Motion.** Alert cards use `framer-motion` — a gentle staggered fade/slide-in on
   load and a scale/fade-out on dismiss (single or bulk), with `layout` so siblings
   reflow smoothly. Dismissals no longer just pop out.

5. **Typography.** The hero status headline moved from ALL-CAPS to Title Case so it
   reads as a headline distinct from the many uppercase micro-labels (hierarchy).

6. **No-results state.** When filters hide everything (but alerts exist), a dedicated
   "No alerts match your filters" card with a Clear button — separate from the "All
   clear" empty state.

## Reordered layout
Hero → **tier filter chips** → **filter bar** → collapsed metrics → alert list →
"How alerts work". Filters/navigation now sit directly under the hero.

## Not changed (intentional)
- "How alerts work" stays at the bottom as reference (moving it up would push the
  alerts down).
- The per-card hover delete + the select-mode bulk delete both remain.

## Follow-up (2026-07-04): removed "verified", simplified bulk select
Per owner request, the whole **verified/acknowledge** concept was removed, and the
select-mode toggle was replaced with a simpler always-on selection:
- The **"Select" toolbar button + select-mode** are gone.
- Each alert card now has a **single always-visible selection checkbox** (red) — no
  verified box to conflict with it anymore. Selecting cards reveals a bulk action bar
  ("N selected · Select all · Clear · Delete N") + confirm dialog. Bulk delete stays.
- The per-card hover trash (single dismiss) remains alongside it.
- **Search is more forgiving:** it strips quotes/smart-quotes and matches each typed
  word anywhere across title + description + affected link, in any order — so a bare
  link name finds the alert whose title wraps it in quotes.
- Removed the verified checkbox, the "Verified · re-checking" badge, the acked card
  styling, the "N verified" counts, and the status (To review / Verified) filter.
- Hero headline is now "N open alerts" (was tied to the ack "to review" count).

**Behaviour note:** auto-clear (an alert dismissing itself when the issue resolves)
was implemented in `persistDetections` **only for acknowledged alerts**. With ack
removed, alerts no longer self-clear — they stay until manually dismissed (dedup still
prevents duplicates). The UI copy was updated to reflect this. If self-clearing is
wanted back, `persistDetections` would need to close any open alert whose condition
is no longer detected (not just acked ones).

## Verification
- `tsc --noEmit` clean, `eslint` clean on the file. Not yet exercised live in-browser.
