# Pricing "Try" buttons did not start checkout

## Problem

In the pricing section (`<Pricing />`, used by both the landing page and `/pricing`), the
Starter and Growth cards rendered their CTA as:

```tsx
<Link href="/pricing">Try Starter</Link>
<Link href="/pricing">Try Growth</Link>
```

Since `/pricing` renders that *same* `<Pricing />` component, clicking "Try Starter" or
"Try Growth" navigated the user to a page that looks identical to the one they were on —
or, when already on `/pricing`, did nothing visible at all. No checkout was ever started.

Only the Free card had a working action (`FreePlanButton`, the invite-code flow).

## Root cause

The tier data carried a plain `href` and no plan identifier, so the cards had no way to
reach the billing flow. The working checkout path already existed
(`UpgradeButton` → `POST /api/billing/checkout` → FanBasis hosted checkout), but the
landing/pricing cards were never wired to it — only the dashboard billing page was.

## Fix

`src/components/landing/Pricing.tsx`:

- Replaced the `href` field on each tier with `plan: TapprPlan | null`
  (`"starter"`, `"growth"`, and `null` for Free).
- Paid tiers now render `<UpgradeButton plan={t.plan}>` instead of `<Link>`. This is the
  same component the dashboard billing page uses:
  - logged out → redirected to `/signup`
  - logged in → `POST /api/billing/checkout` and redirect to the FanBasis payment link
  - the API resolves the team server-side, so it works outside the dashboard providers
- Free tier keeps `FreePlanButton` (unchanged invite-only flow), now selected by
  `t.plan === null` instead of `t.name === "Free"`.
- Card styling preserved by passing `variant="ghost"` plus the original classes
  (`h-auto` restores the custom vertical padding the `Button` default height would clamp).

## Missing Agency card

The Agency plan (€997/mo) existed everywhere *except* the pricing cards: it's in
`TAPPR_PLANS` (checkout works), in the comparison matrix column, in the dashboard billing
page, the sidebar, alerts caps (1M clicks/mo), admin grant-plan and the partner
calculator — but the card grid only rendered Free / Starter / Growth, so nobody could buy
it from the site.

Added an Agency tier to `TIERS` (features taken from the comparison matrix: unlimited
clicks/links/team members/QR codes, priority 4h support) and widened the grid from
`lg:grid-cols-3` to `md:grid-cols-2 lg:grid-cols-4`.

## Price audit

All price sources agree, no mismatch:

| Source | Starter | Growth | Agency |
| --- | --- | --- | --- |
| `src/lib/fanbasis.ts` (`TAPPR_PLANS`, what's actually charged) | 9700c | 29700c | 99700c |
| `src/components/landing/Pricing.tsx` | €97 | €297 | €997 |
| `src/components/pricing/pricing-comparison.tsx` | €97 | €297 | €997 |
| `src/app/(dashboard)/dashboard/billing/page.tsx` | 97 | 297 | 997 |
| `src/app/admin/users/page.tsx` | 97 | 297 | 997 |
| `src/components/partner/partner-calculator.tsx` | 97 | 297 | 997 |

## Verification

- `npx tsc --noEmit` passes.
- Buttons on `/` and `/pricing` now hit `/api/billing/checkout` and redirect to FanBasis;
  logged-out clicks land on `/signup`.
