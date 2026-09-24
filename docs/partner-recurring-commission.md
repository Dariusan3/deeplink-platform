# Partner recurring commission

## Problem
A partner was credited only once per referred user. `creditPartnerOnPaidSignup`
(duplicated in the FanBasis webhook and `/api/billing/activate`) only looked at
referrals with status `pending`. The first payment flipped the referral to
`active`, so every renewal found nothing and credited nothing. The idempotency
check (any earning for the referral) would also have blocked month 2.
Renewals could also fail to resolve the payer: the trial-row email fallback only
matches `status = 'trial'`.

## Fix
- New shared helper `src/lib/partner-credit.ts` → `creditPartnerForPayment`.
  Both callers use it; the two copies are removed.
- Credits the partner commission_rate × plan price on every payment (first
  purchase and each renewal) for referrals `pending` or `active`.
- Idempotency: skips if a commission for the referral was created in the last
  20 days (same payment delivered by webhook + success redirect, or retried).
  Not keyed on calendar month: 30-day cycles land twice in one month some
  years and a month key would drop a payment.
- Referral `plan` / `monthly_value` follow the latest payment; `converted_at`
  is stamped only on the first.
- Webhook: added a renewal fallback that matches the buyer's latest paid
  subscription by email (status active/expired) when the event has no ids.
- `period_month` is now always the 1st of the month (activate used today's date).

## Not done
- Referral is not moved to `churned` on cancel/expiry.
- Commission uses the plan's list price, not the amount actually paid.
- Tiny race if webhook and redirect insert at the same millisecond (no unique
  index, deliberately: no migration needed).
