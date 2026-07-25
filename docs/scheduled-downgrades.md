# Plan switches — downgrade at period end, upgrade immediate

Date: 2026-07-25

## Goal

When a user switches plans, the plan they already paid for this period stays in
force until the period ends; only then does a **downgrade** take effect.
**Upgrades** still apply immediately.

## How it works (leans on existing `owner_best_plan`)

`teams.plan` is derived by `owner_best_plan()` (migration 024): the highest-rank
subscription that is `status='active'` AND not past `expires_at`. The whole
mechanism falls out of that:

- **Upgrade** (Starter → Growth): the new higher sub activates and **supersedes**
  the old lower one immediately → best plan = new plan now.
- **Downgrade** (Growth → Starter): the new lower sub activates but the old
  **higher** sub is left running. `owner_best_plan` keeps the user on Growth
  until Growth's `expires_at` lapses, then Starter takes over. "Keep what you
  paid for until it's done."
- **Cancel** (→ free): the sub is marked `cancel_at_period_end` and kept active
  until `expires_at`, then lapses to free — no more immediate drop on cancel.

## Changes

- **`029_scheduled_downgrades.sql`** — adds `subscriptions.cancel_at_period_end`
  (informational; entitlement is still driven by status + `expires_at`).
- **`src/app/api/webhooks/fanbasis/route.ts`**
  - Supersede-on-activation now only cancels prior subs with **rank ≤ the new
    plan** (upgrades/same). A higher-rank prior sub (the downgrade source) is
    left active to ride to expiry.
  - `subscription.canceled` → sets `cancel_at_period_end=true`, keeps the row
    active until `expires_at` (was: immediate `cancelled`).
  - `subscription.completed` → `expired` now (final end).
- **`src/app/api/cron/anomaly-check/route.ts`** — new **finalizer**: expires paid
  `active` subs whose `expires_at` passed (1-day grace for late renewal
  webhooks). That fires `sync_team_plan`, recomputing the plan → the downgrade /
  cancel actually lands at the boundary. Runs daily (08:00 UTC).
- **`src/components/billing/upgrade-button.tsx`** — downgrade dialog now says the
  plan is kept until period end (nothing changes today) instead of implying an
  immediate drop.

## FanBasis constraint (still manual)

FanBasis charges at checkout and the wrapper has **no outbound cancel/plan-change
API**. So:

- The old (higher) subscription must be **cancelled in the FanBasis dashboard**
  so it stops renewing — the switch dialog tells the user this, and it's the
  agreed manual step. If not cancelled, it renews alongside the new one (double
  charge). This is unchanged from before and unavoidable from code today.
- A downgrade to a cheaper **paid** plan still means the user pays the new plan
  at checkout now (FanBasis can't defer the charge); they keep the higher plan's
  entitlement until its period ends via the logic above.

## Required

- Apply migration `029_scheduled_downgrades.sql`.
- The finalizer rides the existing `anomaly-check` daily cron — no new cron.
