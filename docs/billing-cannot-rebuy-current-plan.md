# Billing: you can no longer buy the plan you already have

## The bug

Nothing stopped an Agency customer from clicking "Try Agency" on `/pricing` and
walking straight into a FanBasis checkout for the plan they were already paying
for. We'd take the second payment and open a second subscription against the same
team.

## The fix, in two halves

### Server (the one that matters)

`/api/billing/checkout` now reads the team's current plan and refuses:

```ts
if (team?.plan === plan) {
  return NextResponse.json(
    { error: `You're already on the ${plan} plan.`, code: "already_on_plan" },
    { status: 409 }
  );
}
```

This has to live in the route and not only on the button. `/pricing` is statically
prerendered, so its buttons can be stale — and nothing stops a direct `POST` to the
endpoint regardless.

### Client (the polite half)

`UpgradeButton` now resolves the team's current plan and compares it with the plan
it's selling, via `purchaseIntent()` in the new [`src/lib/plans.ts`](../src/lib/plans.ts):

| Intent | Button |
|---|---|
| `current` | Disabled, "✓ Current plan" |
| `upgrade` | Normal CTA |
| `downgrade` | "Switch to this plan" — allowed, but it shouldn't read like an upgrade |

Inside the dashboard the plan comes from `TeamContext`. On `/pricing`, which renders
*outside* the dashboard providers, the button queries the user's owned team directly
through Supabase — the same team the checkout endpoint resolves to when it receives
a POST with no `team_id`.

Logged-out visitors see every plan as buyable. That's correct: they sign up first,
and there's no plan to compare against yet.

`PLAN_RANK` / `purchaseIntent` live in their own module because both a client
component and a server route need them, and `fanbasis.ts` — the obvious home —
carries the FanBasis API key and must never reach a client bundle.

## The button used to change its mind in front of you

`/pricing` is statically prerendered and renders outside the dashboard providers,
so `UpgradeButton` starts out knowing nothing. Finding out you're already on Agency
takes an auth round-trip plus a team query. During that window the button showed the
normal "Try Agency" CTA — and then swapped it for "Current plan". You watched it
retract its own offer.

**Cache the last known plan in `localStorage`** (`{ userId, plan }`). On any repeat
visit — including the common path of clicking "Change Plan" on `/dashboard/billing`
— the correct state paints on the first frame with no network wait. The dashboard
writes the cache too, so even the *first* trip from billing → pricing already knows
the answer. It's revalidated in the background, since the cache can belong to a
different user or the plan can have changed.

### Bug I introduced doing this, and the fix

The first version of the cache gated on a helper that answered "is there a session
token?" by scanning `localStorage` for `sb-<ref>-auth-token`, and short-circuited
`no token → logged out`.

Our client is `createBrowserClient` from `@supabase/ssr`. **It stores the session in
cookies, not localStorage.** The check returned `false` for everybody, so every
signed-in user who clicked a plan on `/pricing` was treated as anonymous and bounced
straight to `/signup`.

Two rules came out of it, and both are now enforced in the code:

- `resolvePlan()` **always asks Supabase.** Absence of a token is never treated as
  proof of being logged out. The helper survives only to decide whether the cached
  plan is worth painting early, and it checks cookies *and* localStorage.
- **A failed lookup is not evidence of being logged out either.** The `catch` used to
  clear auth and let the click fall through to `/signup` — so a customer whose wifi
  blinked got kicked to a signup page. Now, if a session token is present, we assume
  they're signed in and let the checkout endpoint be the thing that says 401.

### The button is never disabled while the lookup is in flight

A first attempt at this dimmed the button until the plan resolved. That was worse: a
Switch Plan button you can't press reads as broken, and it's the one thing the user
came to the page to do.

So the button stays live from the first frame. If you out-click the lookup,
`handleClick` finishes it (`resolvePlan()` returns the plan as a *value* — a
`setState` fired in the same tick isn't readable yet) and only then decides whether
to open the confirm dialog, bounce you to `/signup`, or tell you you're already on
that plan. The race can't skip the warnings, because the handler is the only place
that can lose it.

## Switching plans now asks first

Coming from Free, buying a plan stays a single click — there's nothing at stake.
Switching *away from a paid plan* opens a confirmation dialog first, because that
click changes what you're charged and, on a downgrade, what the account can do.

The dialog says the two things a pricing card cannot:

1. **What your cap becomes.** `Agency · Unlimited → Starter · 50,000 clicks/mo`,
   with an amber warning that once you pass the new cap, new visitors see the
   paused page until the cycle resets.
2. **That the old subscription does not stop by itself.** See below.

## ⚠ Known gap: a plan switch does not cancel the old subscription

`/api/billing/checkout` creates a **new** FanBasis subscription. Nothing cancels
the old one. [`src/lib/fanbasis.ts`](../src/lib/fanbasis.ts) exposes
`createCheckoutSession`, `deleteCheckoutSession` and the webhook helpers — there is
**no cancel-subscription call**. So a customer who switches from Agency (€997) to
Starter (€97) is billed for both until someone cancels the Agency subscription on
FanBasis's side.

The same gap makes the **Cancel button on /dashboard/billing misleading**: it runs a
Supabase `update({ status: "cancelled" })` against our own row and tells the user
"Subscription cancelled". FanBasis is never told. The recurring charge continues.

What's shipped here is honesty, not a fix: the switch dialog warns in red that the
old plan must be cancelled separately. **The real fix needs a FanBasis
cancel-subscription API** (or a documented manual process), and that's a decision
above this change.

Our own database is at least consistent now — see the webhook change below.

## Three more things found in billing

### Abandoned checkouts piled up forever

Every call to `/api/billing/checkout` writes a `trial` subscription row so the
webhook can later map a payment back to a team. **Nothing ever cleaned them up.**
A user who opened checkout three times and paid once was left with two `trial` rows
sitting in their Subscription History permanently, looking like real subscriptions.

They were also poisoning the webhook. When FanBasis omits our session id — which
[the webhook's own comments say it does](../src/app/api/webhooks/fanbasis/route.ts) —
it falls back to *"the most recent `trial` row for this buyer's email"*. With several
to choose from, that fallback could activate the wrong plan.

Starting a new checkout now expires the team's earlier unpaid ones.

### A team could end up with two `active` subscriptions

When a switch was paid for, the webhook activated the new subscription row and left
the old one sitting at `status: "active"` beside it. `/dashboard/billing` picks the
current plan with `rows.find(r => r.status === "active")` — with two matches, that's
whichever the query happened to return first.

The webhook now retires the team's previous active row when it activates a new one.
On a renewal it's a no-op (the row being renewed *is* the activated one). `is_free`
rows are left alone on purpose: those are plans an admin granted by hand, and quietly
revoking a grant because a payment webhook fired is not a decision that endpoint gets
to make.

### The billing page named the wrong payment processor

The Payment Method card said *"Stripe checkout will collect a card when you upgrade."*
We bill through FanBasis. Naming the wrong processor on a billing page is exactly the
kind of detail a customer notices and quietly stops trusting you over. Now reads
"FanBasis collects your card at checkout when you upgrade."

## Verified

`tsc --noEmit` clean, `npm run build` succeeds. `eslint` reports one error in
[billing/page.tsx:56](../src/app/(dashboard)/dashboard/billing/page.tsx#L56) — a React
Compiler memoization warning on `fetchAll` that **predates this change** (confirmed by
running eslint against the stashed tree); my edit there was a one-line copy fix.

Not exercised end-to-end: a real 409 needs a live FanBasis-backed team on a paid plan.
