# Alerts page — readability pass + noise cull (2026-07-26)

The alerts page read as one undifferentiated wall of similar rows: hard to tell
which alert was which, and low-value detectors kept adding clutter. Two changes.

## 1. Noise cull — disabled 3 detectors

`src/lib/alert-detectors.ts` (`runAllDetectors` spec list). Disabled (functions
kept for a possible stricter future version):

- **traffic_spike** — "traffic 3× normal this hour", transient by nature.
- **country_shift** — trend FYI, not a decision.
- **device_shift** — trend FYI, not a decision.

`peak_hour_shift` was already off (flapped daily). Now 8 detectors run:
destination_broken, click_drop, click_spam, plan_limit (tier-1, everyone) +
ab_winner, goal_hit, stale_links, subscription_expiring (paid).

Note: existing rows of the disabled types stay in the DB until dismissed — no new
ones are created and they won't be re-detected. Bulk-select + dismiss to clear
the backlog.

## 2. Readability redesign

`src/app/(dashboard)/dashboard/alerts/page.tsx`:

- **Grouped into labelled tier sections** ("Critical", "Opportunities",
  "Strategic", "Operational") instead of one flat list. The header is the scan
  anchor that lets you jump to the alert you care about. Rows stay
  urgency-sorted within a section; unknown/null types fall into tier 4.
- **Two-line rows.** Line 1 = bold subject + the one number the alert is about
  (`404`, `-62%`). Line 2 = category label + one-line gist. The old single-line
  row clipped the subject at 55% width so titles were cut mid-word; splitting the
  lines means the subject never competes with the detail for space.
- **Left accent border per row** carries urgency at a glance (red / amber /
  neutral), replacing the easy-to-miss 2px dot as the primary signal.
- **low severity is now neutral, not green.** A green row read as
  "good/resolved" and polluted the red/amber urgency scale. Green now lives only
  in the "Opportunities" section header, where it means what it should.

Status strip, filters, search, metrics panel, bulk actions unchanged.

## 3. Age-out rule — hide stale alerts

Old alerts cluttered the page. Now, in `fetchAlerts`, alerts are dropped before
they reach state when older than **`STALE_AFTER_DAYS = 7`** — **except tier-1
(Critical)**, which never ages out. A still-open broken destination or hit plan
cap is "losing money right now" regardless of when it first fired; an
opportunity / trend / housekeeping item a week old is not a to-do.

Why created_at + tier and not "condition last confirmed": the schema has no
per-alert re-confirmation timestamp (`teams.alerts_last_checked_at` is
team-level, only "when did a scan last run"), so there's no way to tell from the
row whether the underlying condition is still true. Gating tier-2/3/4 on age is
the safe approximation; exempting tier-1 avoids hiding a live critical.

Gating at fetch (not query) because tier is derived in TS via `ALERT_TIERS`, not
a DB column. Hidden rows stay in the DB — dismiss or let auto-close handle them.

`tsc --noEmit` clean.
