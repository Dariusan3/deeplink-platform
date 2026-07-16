# Partner payout threshold reverted to €500

## Problem

`PARTNER_MIN_PAYOUT` was `0.25`, not the intended `500`.

Commit `61d8242` (2026-06-20) lowered it temporarily to test the payout flow
end-to-end while plan prices were set to $1, with an explicit note: *"REVERT to
500 before launch."* The revert never happened. The original value comes from
`b6e28c4` (2026-05-02), which introduced the file with `PARTNER_MIN_PAYOUT = 500`.

The test premise was already stale. Plan prices are back at production values
(€97 / €297 / €997 — `plans.ts`, `fanbasis.ts`, the landing page). At a 25%
commission a single Starter conversion credits €24.25, which clears a €0.25
floor ~97x over. Every partner could request a payout after one referral.

Two things made this hard to spot:

- `PARTNER_MIN_PAYOUT` and `PARTNER_COMMISSION_RATE` both read `0.25` — two
  unrelated quantities sharing a literal, so the wrong one looks intentional.
- The payout progress card renders `€0 · €0 · €0 · €0 · €0.25` at a 0.25
  threshold, which reads as a formatting bug rather than a wrong constant.

## Fix

| File | Change |
|---|---|
| `src/lib/partner-config.ts` | `PARTNER_MIN_PAYOUT` `0.25` → `500`; TEMP comment replaced with a note on units and meaning |
| `src/app/partner/page.tsx` | Payout card mixed `€` and `$` for the same value — all `$` → `€` |
| `src/components/partner/partner-calculator.tsx` | Dropped hardcoded `{starter: 97, growth: 297, agency: 997}`; now imports `PLAN_PRICE_EUR` / `PLAN_LABEL` from `plans.ts`. Stripped to a basic calculation (see below) |

### Calculator stripped to a basic calculation

Removed from `partner-calculator.tsx`, per request: the word-of-mouth growth
slider and its `viral` state, the 12-month compounding projection
(`projection` / `year1Recurring` / `year1Total`), the 12-month bar chart, and
the AI-style prediction summary.

What remains is `referrals × plan price × PARTNER_COMMISSION_RATE`, a per-plan
figure and a total. No growth modelling.

This also resolves half of known issue #1 below: the subtitle no longer claims
"recurring" commission, and the projection that had no basis in the crediting
code is gone.

The threshold has four consumers, all reading the same constant, so the single
edit propagates: `api/partner/payout-request/route.ts`, `partner/earnings/page.tsx`,
`partner/page.tsx`, `lib/email.ts` (monthly report).

Verified with `npx tsc --noEmit` (clean) and by confirming €97/€297/€997 now
agrees across `fanbasis.ts`, `plans.ts`, `Pricing.tsx`, and the calculator.

## Known issues, not addressed here

These surfaced while auditing partner pricing. Both are business decisions, not
mechanical fixes.

### 1. "Recurring" commission is still advertised outside the calculator

The crediting code pays once, not per renewal:

- `api/webhooks/fanbasis/route.ts:362` — "log a one-time commission"
- `api/webhooks/fanbasis/route.ts:241-243` — renewal events skip the
  `partner_earnings` insert

The calculator no longer contradicts this. Two surfaces still do:

- `partner/page.tsx:163` — "Earn 25% **recurring** on every paying customer"
- `docs/partner-system.md:3,10,39` — documents "25% recurring commission"

Either the crediting code should pay on renewal, or this copy should drop
"recurring". Left as-is pending a decision on which way to go.

### 2. `total_earned` has two writers that disagree

- `api/admin/partner/payout/route.ts:71` increments: `total_earned += payout.amount`
- `recomputePartnerTotals` (`api/billing/activate/route.ts:215,221`) defines it
  as `SUM(all earnings)`

Any conversion after a payout recomputes and wipes the increment. Related:
marking a payout paid never flips `partner_earnings.status` to `'paid'`, so the
next recompute restores `pending_payout` to include already-paid earnings —
a partner could be paid twice for the same commission.
