-- Scheduled downgrades: a plan the user is downgrading FROM stays in force
-- until the end of the period they already paid for, then lapses to the lower
-- plan. Upgrades still apply immediately.
--
-- This leans on the existing owner_best_plan() logic (migration 024), which
-- already picks the highest-rank subscription that is `active` AND not past
-- `expires_at`. So the whole mechanism is: on a downgrade, DON'T cancel the old
-- (higher) subscription — let it ride to expiry. owner_best_plan keeps the user
-- on it until then, and drops to the lower plan once it lapses.
--
-- `cancel_at_period_end` records that a subscription is set to stop renewing
-- (either the user cancelled it in FanBasis, or they scheduled a downgrade). It
-- is informational for the billing UI; entitlement is still driven purely by
-- status + expires_at.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
