# Plans: pricing audit, and making the click cap real

## The question

"Are the prices on the plans the real ones — the ones actually charged?"

## Answer: yes, the prices are correct and consistent

The payment provider is **FanBasis**, not Stripe.

`src/lib/fanbasis.ts` is the single source of truth:

| Plan | `amountCents` | Charged | Renews |
|---|---|---|---|
| Starter | 9700 | €97 | every 30 days |
| Growth | 29700 | €297 | every 30 days |
| Agency | 99700 | €997 | every 30 days |

`src/app/api/billing/checkout/route.ts` passes `amountCents` straight from that catalog to the
checkout session, so what the customer is charged is exactly what the catalog says. And the
display matches everywhere it appears:

- `src/components/landing/Pricing.tsx` — €0 / €97 / €297 / €997
- `src/components/pricing/pricing-comparison.tsx` — same
- `src/app/(dashboard)/dashboard/billing/page.tsx` — `PLAN_PRICES = { starter: 97, growth: 297, agency: 997 }`

### One caveat that code cannot answer

`amountCents` is just a number. **The currency is whatever the FanBasis account is configured
to.** If that account is set to USD, the site shows €97 and the customer is charged $97. This is
flagged in a comment in `fanbasis.ts` and is worth confirming in the FanBasis dashboard — it
cannot be verified from the repository.

## But the audit turned up two real problems — both about clicks, not prices

### Problem 1 — the click cap was never enforced

`planClickCap()` was read in exactly two places: `src/lib/alert-metrics.ts` (the usage bar) and
`src/lib/alert-detectors.ts` (the plan_limit alert). **The redirect path never checked it.** The
only thing that sent a visitor to `/paused` was `is_active = false`, and nothing set that based
on usage.

Meanwhile the product told users, in two places, in as many words:

> "New visitors will see the paused page until you upgrade or the cycle resets on the 1st."

That did not happen. Links kept redirecting past the cap on every plan — which means **Free was
in practice unlimited**, despite being sold as 500 clicks/month.

### Problem 2 — Agency was sold as unlimited but capped at 1,000,000

`/pricing` and the comparison table both advertise Agency as **"Unlimited clicks"**. But
`PLAN_CLICK_CAPS.agency` was `1_000_000`, and the alerts page labelled Agency as
"1,000,000 clicks/mo".

So an Agency customer paying €997/month who crossed 1M clicks would be shown an alert saying
they had hit their limit and should *"consider upgrading"* — to a plan that does not exist.

## Fixes

### Agency is now genuinely uncapped

`PLAN_CLICK_CAPS.agency = Infinity`, plus a new `hasClickCap(plan)` helper in `src/lib/alerts.ts`.

Callers must guard on it, because `used / Infinity` is `0` and `Infinity.toLocaleString()`
renders as `"∞"` — neither is something to show a paying customer. Guarded:

- `detectPlanLimit()` returns early on an uncapped plan (also saves a pointless count query)
- the alerts PlanBanner now says "Unlimited clicks" and **hides the progress bar entirely** — a
  bar with no end is meaningless — showing just the raw monthly count instead

### The cap is now enforced at redirect time

New `src/lib/click-quota.ts`:

- `isTeamOverClickCap(teamId)` — counts the team's clicks since the 1st of the calendar month
  (the same boundary the alert promises and `computeAlertMetrics` already uses) and compares
  against the plan's cap.
- **Cached per team, 60s TTL**, tagged `team-quota:<teamId>`. This is the product's hot path, so
  the verdict costs at most one count query per team per minute — not one per click.
- **It fails open.** If the lookup errors, the click goes through. A transient database blip must
  not take a paying customer's links offline: over-serving for a minute is recoverable, showing
  every visitor a "paused" page wrongly is not.

`src/app/[slug]/route.ts` checks it **once, before the three namespaces branch**, so a rotator or
an A/B test cannot route around the cap. `SlugResolution` now carries a top-level `teamId`
resolved from whichever namespace matched.

Over-cap visitors land on `/paused?reason=quota`, which now shows different copy: "Link
Unavailable / temporarily unavailable" rather than "Link Deactivated". The link isn't
deactivated — the account is out of quota — and the wording stays vague on purpose, because a
visitor is not entitled to know the link owner's billing status.

### Invalidating the quota verdict when a plan changes

This needed care. **The plan is account-wide and changes without any application code running.**

`sync_team_plan` is a **database trigger** on `subscriptions` (migration `024_account_wide_plan.sql`):
it recomputes the owner's best plan and writes it to **every team that owner created**. So:

- invalidating only the team named on the subscription would leave the owner's *other* teams
  stuck behind a stale "over cap" verdict, and
- hooking only `src/app/api/billing/activate/route.ts` (the one place that writes `teams.plan`
  directly) would miss the FanBasis webhook entirely — it writes `subscriptions`, and the trigger
  does the rest.

Hence `invalidateOwnerQuota(supabase, teamId)`, which resolves the owner and purges the verdict
for all their teams. Called from **both** `billing/activate` and the FanBasis webhook (on renew
and on cancel alike — a downgrade tightens the cap and must also take effect).

A customer who has just paid to lift the cap does not wait out a TTL with their links dark.

## Verification

Ran against the real modules (`PLAN_CLICK_CAPS`, `planClickCap`, `hasClickCap`, `TAPPR_PLANS`):

- FanBasis charges €97 / €297 / €997 every 30 days — matches every display surface.
- Agency: `planClickCap('agency') === Infinity`, `hasClickCap('agency') === false`.
- Free / Starter / Growth still have real ceilings (500 / 50,000 / 250,000).
- An unknown or `null` plan falls back to **free (500)**, not to unlimited — the failure mode of
  a typo'd plan string must be restrictive, not a free unlimited tier.
- Every plan in the price catalog has a matching cap entry, so a new paid plan can't be added
  without one.

All pass. `npx tsc --noEmit` clean; `npx next build` compiled successfully. The resolver still
serves redirects normally (no team is over cap today, so the fail-open path is what runs).

### Not verified

The enforcement actually firing. No team is anywhere near its cap, and forcing one would mean
inserting several hundred thousand `link_clicks` rows into the live database. The logic is
straightforward and fails open, but the first real over-cap event is worth watching — or worth a
deliberate test against a team whose cap is temporarily lowered.

Also not verified: that the FanBasis account's currency is EUR (see caveat above).

## Files changed

- `src/lib/alerts.ts` — Agency uncapped; new `hasClickCap()`
- `src/lib/click-quota.ts` (new) — cached, fail-open cap check + account-wide invalidation
- `src/app/[slug]/route.ts` — enforces the cap before the three paths branch
- `src/lib/link-cache.ts` — `SlugResolution.teamId`
- `src/app/paused/page.tsx` — distinct copy for `?reason=quota`
- `src/lib/alert-detectors.ts` — skips plan_limit on an uncapped plan
- `src/app/(dashboard)/dashboard/alerts/page.tsx` — "Unlimited clicks", no progress bar when uncapped
- `src/app/api/billing/activate/route.ts`, `src/app/api/webhooks/fanbasis/route.ts` — quota invalidation
