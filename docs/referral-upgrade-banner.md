# Referral upgrade banner

Accounts that sign up through a partner link only ever see the Free plan (the
referral funnel hides paid prices), so nothing pointed them at billing.

- `src/components/dashboard/referral-upgrade-banner.tsx` — slim banner at the
  top of the dashboard: "You're on the Free plan… See plans" → `/dashboard/billing`.
  Dismissible (localStorage `tappr_referral_upgrade_dismissed`).
- Shown only when the user has a `pending` referral (never paid) AND the active
  team is on `free`. Disappears after the first payment (referral → `active`).
- `GET /api/partner/my-referral` — returns `{ pendingReferral: boolean }`.
  Needed because `partner_referrals` RLS only lets the partner read the row;
  the referred user can't from the browser. Boolean only, no partner details.
- Mounted in `dashboard-shell.tsx`.
- Attribution is unaffected: a later purchase still credits the partner
  (see partner-recurring-commission.md).
