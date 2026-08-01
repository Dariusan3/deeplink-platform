# Partner program updates (2026-07-26)

## 1. Commission raised to 50%

- `src/lib/partner-config.ts` — `PARTNER_COMMISSION_RATE` 0.25 → **0.5**.
- `src/app/api/partner/repair-profile/route.ts` and
  `src/app/api/admin/partner/activate/route.ts` no longer hardcode `0.25`; both
  now import `PARTNER_COMMISSION_RATE`, so new partner profiles get 50%.
- The overview page already renders `profile.commission_rate` dynamically, so it
  shows "50%" once the DB rows are updated.

**Existing partner rows** still need a one-time DB update (the webhook reads
`partner_profiles.commission_rate` per partner). Run in the Supabase SQL editor:

```sql
update partner_profiles set commission_rate = 0.5 where commission_rate <> 0.5;
```

(The scripted update was blocked by the local safety classifier — run the SQL
above, or approve the script at scratchpad/set-commission-50.mjs.)

## 2. Clean referral link — /signup/@CODE

Replaces the old `/?ref=CODE` query-string link with a clean path-based one that
**stays in the address bar** (no redirect, no `?ref=` ever shown).

- Signup form extracted to `src/components/auth/signup-form.tsx` (takes a
  `refCode` prop) so two pages can render it:
  - `src/app/(auth)/signup/page.tsx` — the canonical page, still reads legacy
    `?ref=CODE` (old links, landing `ReferralTracker`).
  - `src/app/(auth)/signup/[code]/page.tsx` — server component for
    `/signup/@CODE`: strips the leading `@`, records the click (country/device,
    like `partner/track-click`), and renders the signup form with the code. No
    redirect, so the URL stays `/signup/@CODE`.
- `src/hooks/use-partner.ts` — `referralUrl` now builds
  `${origin}/signup/@CODE`.
- The referral is attributed exactly as before (user metadata + localStorage →
  claim-referral). Verified live: `/signup/@TESTCODE` → 200, renders the form
  with a "Referred by TESTCODE" badge, URL unchanged.
- The earlier `/r/[code]` route was removed in favour of this.

The old `/?ref=` landing capture (`ReferralTracker`) is left in place so any
links already shared keep working.

## 3b. Referral onboarding funnel (2-week free-trial framing)

Arriving via a partner link (`/signup/@CODE`) now shows a 3-step funnel instead
of the bare signup form. `src/components/partner/referral-onboarding.tsx`:

1. **Congrats** — "Congratulations — 2 weeks free. Press Continue." + the
   inviting code.
2. **Pricing (trimmed)** — the free plan is relabelled **"Free Trial"**,
   highlighted, priced ("Free for 2 weeks") and is the **only** card with a CTA
   ("Register free"). The paid tiers (Starter/Growth/Agency) are shown for
   context but **their prices are hidden** ("Available in-app") and dimmed, so
   the eye lands on the free signup.
3. **Signup** — the normal `SignupForm`, referral code attached as before.

`src/app/(auth)/signup/[code]/page.tsx` renders `ReferralOnboarding` (still
records the click server-side). The plain `/signup` page is unchanged (no
funnel).

**"2 weeks free" is messaging only** (per product decision) — the referred user
lands on the normal free plan, framed as a trial to cut signup friction. No
billing/trial mechanism was wired. Verified live: `/signup/@131zy67z` → congrats
step renders.

### Congrats step + CAPTCHA
- The congrats step leads with the **Tappr logo** (the old "You've been invited"
  microlabel line was removed).
- **hCaptcha image-challenge CAPTCHA** gates Continue so bots can't walk the
  funnel: `src/components/ui/hcaptcha.tsx` (widget) +
  `src/app/api/verify-captcha/route.ts` (server-side token check). hCaptcha shows
  the "select every image with an animal…" picture puzzles. Continue is disabled
  until the check passes and the token verifies server-side.
- **Keys**: falls back to hCaptcha's official TEST keys so it works in dev — but
  the test key only shows a pass-through checkbox, **not** the real image
  puzzles. **For production, set real keys** (free at hcaptcha.com) or the CAPTCHA
  gives no real protection and no image challenge:
  - `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` (public, from the hCaptcha dashboard)
  - `HCAPTCHA_SECRET_KEY` (server)

## 3. Responsive sizing

Metric numbers on the partner overview and My Link pages were `text-2xl` even on
the smallest screens, where a large euro figure next to its icon could overflow a
2-column tile. Changed to `text-xl sm:text-2xl` so they scale down on phones and
back up from the `sm` breakpoint. (Further device-specific fixes pending a
concrete report of what still looks off.)

`tsc --noEmit` clean.
