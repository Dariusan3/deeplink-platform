# Plan Entitlements — audit & enforcement

Date: 2026-07-25

## Why

Audit of every plan tier (`free` / `starter` / `growth` / `agency`) against the
public pricing page found the product did **not** match what pricing sells:

- **Less than promised:** AI Brain free cap was `5` chats (pricing says `10`);
  starter/growth were capped at `20`/`50` (pricing says "Unlimited").
- **More than promised (leaks):** almost every advertised limit/flag was
  unenforced — free users effectively had links, API, custom routing, remove
  branding, collections, seats, Instagram, etc. Only the monthly click cap and
  the Brain chat count were enforced.

Source of truth is now a single map; enforcement reads it, so pricing and code
cannot drift.

## Source of truth

`src/lib/entitlements.ts` — `ENTITLEMENTS: Record<PlanKey, PlanEntitlements>`.
Every number and flag mirrors `src/components/pricing/pricing-comparison.tsx`
and `src/components/landing/Pricing.tsx`. Helpers: `entitlements()`,
`planLimit()`, `hasFeature()`, `isUnlimited()`, `wouldExceed()`,
`routingConditionAllowed()`.

Downstream files now derive from it (no duplicated numbers):
- `src/lib/plan-limits.ts` — `BRAIN_CHAT_LIMITS` (fixes free `5` → `10`).
- `src/lib/alerts.ts` — `PLAN_CLICK_CAPS`.

| Feature | free | starter | growth | agency |
|---|---|---|---|---|
| Clicks / month | 500 | 50,000 | 250,000 | ∞ |
| Links | 25 | 500 | 5,000 | ∞ |
| Team members | 1 | 3 | 10 | ∞ |
| AI Brain chats / mo | 10 | ∞ | ∞ | ∞ |
| Collections | 5 | ∞ | ∞ | ∞ |
| Dynamic QR codes | 3 | 25 | 250 | ∞ | *(see gap #1)* |
| Smart routing | — | geo+device | all | all |
| Traffic rotator / split test | ✗ | ✓ | ✓ | ✓ |
| Anomaly alerts | Basic (tier-1) | All | All | All |
| AI weekly report | ✗ | ✓ | ✓ | ✓ |
| Email alerts | ✗ | ✓ | ✓ | ✓ |
| Role-based access | ✗ | ✓ | ✓ | ✓ |
| Remove branding | ✗ | ✗ | ✓ | ✓ |
| Custom domain | ✗ | ✗ | ✓ | ✓ | *(see gap #2)* |
| Instagram | ✗ | ✓ | ✓ | ✓ | *(see gap #3)* |
| Developer API | ✗ | ✗ | ✓ | ✓ |

## Enforcement architecture

Resources are created **client-side directly against Supabase (RLS)** — there
is no server route in the create path. Client-only checks are therefore
bypassable. Numeric caps and the two client-written feature flags are enforced
at the **database** (non-bypassable); friendly client pre-checks avoid the raw
error round-trip and surface `PLAN_LIMIT:`-prefixed messages as toasts.

### Database (non-bypassable)

- **`supabase/migrations/026_plan_resource_limits.sql`** — `BEFORE INSERT`
  triggers on `links`, `collections`, `team_members` enforcing the numeric caps
  (`plan_resource_limit()`; `NULL` = unlimited). `SECURITY DEFINER` so counts
  ignore the caller's RLS view.
- **`supabase/migrations/027_plan_feature_gates.sql`** — triggers on
  `links.redirect_rules` (smart-routing condition types per plan) and
  `team_settings.show_branding` (remove-branding gate). Fire only when the
  gated column changes, so a downgrade never retro-breaks existing config
  (grandfathering).
- **`supabase/migrations/028_plan_feature_gates_2.sql`** — triggers on
  `collections.is_rotator` (traffic rotator, Starter+), `ab_tests` insert
  (split testing, Starter+), and `api_keys` insert (Developer API, Growth+).
  These close the direct-Supabase bypass on those client-written resources.

Apply in order (026 → 027 → 028) with `supabase db push` (or the MCP
`apply_migration`). All idempotent (`create or replace` + `drop … if exists`).

### Bypass note — the rotator edit path

`use-collections.ts` gated `createCollection(isRotator)` but NOT
`updateCollection({ is_rotator: true })` (the edit dialog), so a free user could
make a normal collection then edit it into a rotator. Fixed: `updateCollection`
now checks `trafficRotator`, and migration 028 enforces it at the DB.

### App-level gates

| Feature | Where | Behavior |
|---|---|---|
| Links / collections / seats | `links-provider.tsx`, `use-collections.ts`, `use-team-members.ts` | friendly toast + throw before insert; DB trigger backstops |
| AI Brain chats | `use-brain-chats.ts` (pre-existing) | now reads corrected limits |
| Smart routing (API) | `api/v1/links/route.ts` → `parseRedirectRules(…, plan)` | 400 with plan message |
| Smart routing (dashboard) | `links-provider.tsx` `updateLink` surfaces DB `PLAN_LIMIT` | toast |
| Traffic rotator / split test | `use-ab-tests.ts` `createTest`, `use-collections.ts` rotator | blocked below starter |
| Developer API | `lib/api-auth.ts` | 403 on every request if plan lacks `developerApi` (revokes on downgrade) |
| AI weekly report | `api/ai/weekly-report/route.ts` | 403 below starter |
| Email alerts | `api/cron/anomaly-check/route.ts` | skips email below starter (alert still shows in-app) |
| Anomaly alert types | `lib/alert-detectors.ts` `runAllDetectors` | free = tier-1 only; paid = all |
| Remove branding | `settings/page.tsx` toggle (gated) + `use-settings.ts` | toggle disabled below growth; DB trigger backstops |
| Instagram | `api/ig/callback/route.ts` | rejects OAuth below starter |

### Still client-only (bypassable by a direct Supabase call)

- **AI Brain chat count** (`use-brain-chats.ts`). Not DB-enforced. Also note the
  existing code caps *total* chats, while pricing wording is "10 chats / mo" —
  the monthly-vs-total semantics were left unchanged to avoid a silent behavior
  shift. Decide the intended semantics before adding a DB trigger.

Everything else in the list above is now backstopped at the DB.

### Roles — no code needed

Role-based access is free:✗ / paid:✓. Free is single-seat (cap 1), so the only
member is the owner and no role can be assigned. The seat cap alone makes this
consistent with pricing.

## Gaps — features pricing sells that the product does NOT implement

These cannot be "gated to a plan" because they do not exist as a real feature
for **any** plan. Flagged for a product decision (build, or remove from pricing):

1. **Dynamic QR codes (3 / 25 / 250 / ∞).** No `qr_codes` table. QR is rendered
   on-the-fly from each `links` row (`src/components/qr/*`) — download only, not
   a persisted, countable resource. Nothing to cap. Either build dynamic QR as a
   real resource, or drop the row from pricing (QR is effectively "unlimited,
   static" for everyone today).
2. **Custom domain (growth / agency).** Not implemented. Settings hardcodes
   `default_domain = "tappr.me"` and the UI literally says *"Custom domains
   aren't available yet."* `entitlements.customDomain` exists for when it ships.
3. **Instagram connect flow.** Only the OAuth **callback** exists — there is no
   "Connect Instagram" button anywhere that builds the authorize URL. The plan
   gate on the callback is in place, but no user can start the flow yet.

## Verification

- `npx tsc --noEmit` → clean.
- Manual: on `free`, creating a 26th link / 6th collection / inviting a member /
  setting a routing rule / toggling remove-branding / calling the API should all
  be blocked with a plan message. On `agency`, all unlimited.
