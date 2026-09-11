# Pricing plan changes — 2026-09-11

Tightened Free/Starter/Growth limits. Agency is unchanged.

## Numbers, before → after

| | Free | Starter | Growth |
|---|---|---|---|
| Clicks/month | 500 → **100** | 50,000 → **5,000** | 250,000 → **50,000** |
| Links | 5 (unchanged) | 500 → **50** | 5,000 → **150** |
| Team members | 1 (unchanged) | 3 → **2** | 10 → **5** |
| Click goals | always on → **off** | on | on |
| AI Brain | 10 chats/mo (lifetime, unenforced) → **1-hour session/day** | Unlimited → **1 conversation/day** | Unlimited → **10 conversations/day** |

Single source of truth: `src/lib/entitlements.ts`. Its own header comment requires every number here to match `src/components/landing/Pricing.tsx` and `src/components/pricing/pricing-comparison.tsx` exactly — both were updated in the same change.

## AI Brain: two different mechanisms, not one number

The ask ("1 hour session" / "1 conversation per day" / "10 chats per day") doesn't fit a single knob, because Free's constraint and the paid tiers' constraint are shaped differently:

- **Free** is time-boxed: once you send a message, you get 1 hour of AI Brain access for the rest of that UTC day, across every conversation — old or new. Enforced at **every message**, in `src/app/api/ai/chat/route.ts`, before the Groq call runs (so a blocked message costs nothing).
- **Starter/Growth** are count-boxed: N *new* conversations per UTC day. Existing conversations stay open — the cap only stops you starting another thread. Enforced by RLS on `brain_chats` INSERT (migration `031_ai_brain_daily_limits.sql`), not by the API route.

New field in `PlanEntitlements`: `brainSessionHours: number | null`. Free sets it to `1`; paid plans set it to `null` and use the existing `brainChats` field instead (repurposed from "lifetime total" to "per UTC day").

### Why this needed a migration, not just new numbers

Before this change, **nothing enforced any AI Brain limit server-side**. `src/hooks/use-brain-chats.ts` disabled a "New chat" button once a lifetime count was hit — client-side only. A user could call `supabase.from("brain_chats").insert(...)` directly, or hit `/api/ai/chat` on an existing conversation, with nothing to stop them. Shipping tighter numbers without fixing that would have been decorative.

`supabase/migrations/031_ai_brain_daily_limits.sql`:
- `teams.brain_session_started_at timestamptz` — Free's UTC-day session cursor. Written by the chat route via a service-role client (not the user's own session), because any team member — not just the owner — needs to be able to advance it, and `teams`' own RLS only lets the owner UPDATE.
- `brain_daily_chat_cap(plan text) returns int` — SQL mirror of the day-count values for starter/growth. Duplicated from `entitlements.ts` on purpose (a Postgres policy can't import a TS module), same accepted tradeoff as `partner_id_for_code()` in migration 028. **If the numbers in `entitlements.ts` change, this function must change with them.**
- `brain_chats_insert` policy gained a self-referential day-count check: `(select count(*) from brain_chats where team_id = team_id and created_at >= today) < brain_daily_chat_cap(plan)`.

Verified live (rolled-back transactions, real RLS, not a code read-through):
- Starter: 1st conversation today → allowed, 2nd → blocked by RLS.
- Growth: 10 allowed, 11th blocked.
- The unrelated `teams`/`links`/`team_members` access check from the RLS performance pass (see the Sept 2026 perf doc) still holds: 61/61 links visible as user vs. service-role.

### Client-side follow-through

- `use-brain-chats.ts`: the "can I start a new chat" check moved from `chats.length` (lifetime) to a same-UTC-day filter, so the button disables at the same moment the RLS insert would reject it — and re-enables at midnight UTC, matching the server.
- `brain/page.tsx` and `floating-chat.tsx` (two separate, duplicated fetch+NDJSON-parsing implementations of the same chat call) both previously showed **"Sorry, I couldn't connect to the AI. Make sure your API key is set."** for any non-200 response. A 429 plan-limit rejection would have hit that exact branch and told a free user to go check an API key they don't have. Both now special-case `res.status === 429`, read the JSON body's `message`, and show it verbatim.

## Click goals

New `clickGoals: boolean` on `PlanEntitlements` (false for Free, true otherwise). Gated at the UI layer in two places — `src/app/(dashboard)/dashboard/links/[id]/page.tsx` (per-link goal) and `src/app/(dashboard)/dashboard/collections/page.tsx`'s `CollectionGoalEditor` (per-collection goal): input disabled, "Available on Starter and above" hint, and the save payload forces `null` regardless of what's in the disabled field (guards a value typed before a downgrade, or a stale render).

This is **UI-level only**, not RLS-level. A technically-inclined Free user could still PATCH `click_goal` directly via the Supabase client with the anon key — `links` UPDATE policy is role-based only, no column restriction. Left this way deliberately: click goals cost nothing to set (no LLM spend, no infra cost, it's a label), unlike AI Brain, which was hardened at the RLS/API layer because it directly costs Groq API money per bypass.

## Copy drift fixed along the way

Nine files quoted the old "500 clicks/month" Free number independently of the pricing page — landing hero, final CTA, login/signup trust badges, SEO metadata and FAQ schema (`src/lib/seo.ts`), the billing page's plan description, and the partner referral-onboarding funnel's own duplicated tier list (`src/components/partner/referral-onboarding.tsx`). All updated to 100. The billing page description also said "all routing rules" for Free, which was already false before this change (Free has always had `routing: "none"`) — corrected while touching that line.

## Verification

- `tsc --noEmit`: clean.
- `eslint` on every touched file: no new errors (compared line-for-line against a `git stash` baseline — same pre-existing `set-state-in-effect`/memoization/`no-html-link-for-pages` findings, same count, just shifted line numbers).
- `npm run build`: compiles. (Hit the known local `@next/swc-darwin-arm64` truncated-install issue again — same fix as before, `rm -rf` the package dir and `npm install`.)
- RLS: proven live in rolled-back transactions, not inferred from reading the policy — see above.
