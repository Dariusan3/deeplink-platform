# Tappr / Deeplink Platform — Handoff Report

A single-file overview for anyone taking over the project. Read once, start working.

---

## 1. What the product is

A link-shortening SaaS. Users create `tappr.me/<slug>` short links and get:

- **Smart routing** — one slug → different destinations based on country, device, time-of-day, date range.
- **Analytics** — clicks, geo, device, referrer, browsers, peak hours, daily trends.
- **AI Brain** — chat assistant that reads your analytics + business context to give advice (Groq / LLaMA 3.3 70B).
- **Anomaly alerts** — cron detects traffic drops, silent links, traffic concentration, paused-but-trafficked links, goal-miss forecasts. Pushed via Supabase Realtime + email.
- **A/B testing** — 50/50 split, auto-winner with email.
- **Affiliate program** — tiered commissions (10/20/30%) + FIFO pyramid leaderboard.
- **Admpin panel** — user + subscrition management.
- **Developer API** — REST + bearer tokens.
- **Instagram integration** — OAuth + profile-views → link-clicks funnel.

Branding is **Tappr** (`tappr.me`). Folder is `deeplink-platform` (legacy name).

---

## 2. Tech stack

| Layer     | Tech                                                          |
| --------- | ------------------------------------------------------------- |
| Framework | Next.js 16.1.6 (App Router)                                   |
| Language  | TypeScript 5                                                  |
| UI        | React 19.2, Tailwind CSS 4, shadcn/ui, Base UI, Framer Motion |
| Backend   | Next.js API Routes + Supabase (Postgres + RLS + Realtime)     |
| Auth      | Supabase Auth (email + Google OAuth)                          |
| AI        | Groq (LLaMA 3.3 70B chat, 3.1 8B anomaly enhance)             |
| Email     | Resend                                                        |
| Deploy    | Vercel (Hobby plan — 1 cron/day limit)                        |

## 3. Scale (current)

14 DB migrations · 13 dashboard pages · 3 admin pages · 4 auth pages · 12 API routes · 17 hooks.

---

## 4. Running it

```bash
npm install
npm run dev        # :3000
```

Need Node ≥ 20 and a Supabase project with all 14 migrations applied.

### Environment variables (`.env.local`)

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used by cron + admin routes)
- `GROQ_API_KEY`
- `RESEND_API_KEY`
- `CRON_SECRET` (bearer token for the cron endpoint)

> Note: `NEXT_PUBLIC_ADMIN_PIN` was **removed** in the 2026-07-04 compliance fixes —
> the admin panel is now gated server-side via `users.is_admin`. Safe to delete from
> your env. See `docs/compliance-fixes.md`.

**Optional:**

- `NEXT_PUBLIC_IG_APP_ID` + `IG_APP_SECRET` — Instagram OAuth
- `RESEND_FROM_EMAIL` (default: `Tappr Alerts <alerts@tappr.me>`)
- `SUPPORT_EMAIL` (default: `support@tappr.me`)

**Unused but present:**

- `ANTHROPIC_API_KEY` — SDK installed, no code paths use it yet.

---

## 5. Source layout

```
src/app/
  (auth)/              login, signup, forgot/reset password
  (dashboard)/         13 pages (links, qr-codes, collections, teams, analytics,
                                 alerts, brain, ab-testing, affiliate, developer,
                                 contact, settings + root)
  admin/               overview + users + subscriptions
  api/
    ai/                chat, anomaly-check, weekly-report
    contact/           contact form submission
    cron/              anomaly-check (daily 08:00 UTC)
    ig/                Instagram OAuth callback + insights
    v1/                public REST (links, stats, ab-tests)
    admin/             toggle-admin
  [slug]/route.ts      public redirect handler (rotator → A/B → rule-eval → redirect)

src/components/        UI organized by feature (analytics, links, collections, dashboard, qr, teams, ui)
src/hooks/             17 hooks — one per resource
src/lib/               supabase clients, email, ab-testing, countries, plan-limits, api-auth
src/types/             database.ts (generated), links.ts (domain)
supabase/migrations/   14 SQL files, numbered, applied in order
docs/                  this folder
```

---

## 6. How the redirect works

`tappr.me/<slug>` hits `src/app/[slug]/route.ts`:

1. **Rotator collection?** — random pick from the collection's active links.
2. **A/B test?** — 50/50 split if no winner, else 100% to winner; increments counters atomically via RPC; cron + on-visit both check auto-winner.
3. **Regular link** — evaluate `redirect_rules` by priority; first rule whose geo+device+time conditions match wins; fallback = `destination_url`. Log click with country/device/referer.

---

## 7. Database (Supabase Postgres)

Key tables (all with RLS, scoped to team members):

- `users`, `teams`, `team_members` — identity + roles (owner/editor/viewer)
- `links` + `link_clicks` — core data; `redirect_rules` is JSONB
- `collections` — groupings, with rotator + starred
- `ab_tests` + `ab_test_events` — A/B testing
- `anomaly_alerts` — in Realtime publication
- `brain_chats` + `business_brain` + `weekly_reports` — AI state
- `ig_integrations` — Instagram tokens
- `subscriptions` — plans, with trigger syncing `teams.plan`
- `affiliates` + `affiliate_referrals` — affiliate program
- `api_keys` — SHA-256 hashed, prefix `dl_`
- `platform_blocked_hosts` — destinations the self-shortening guard rejects

RPC functions: `is_team_member`, `get_team_role`, `increment_ab_visit`, `increment_ab_conversion`.

### Applying migrations

Open Supabase SQL Editor, paste each file from `supabase/migrations/` in order (001 → 014). They're idempotent.

---

## 8. What runs automatically

**One daily cron** at 08:00 UTC (`/api/cron/anomaly-check`) — authorized via `Authorization: Bearer $CRON_SECRET`. It does all of this in one run (Vercel Hobby = 1 cron/day):

1. Anomaly detection per team (traffic drop/spike, silent link, paused-but-trafficked, concentration risk, goal-miss forecast).
2. AI enhancement (Groq adds root cause + action).
3. Dedup vs last 4h (on `team + title + affected_link`), insert into `anomaly_alerts`.
4. Email high-severity alerts to team owners.
5. Finalize A/B winners that missed their on-visit trigger.

**Realtime push** — `anomaly_alerts` is in the Supabase Realtime publication; the sidebar badge updates live.

---

## 9. Security & guards

- **RLS everywhere** — team-scoped tables filter by `is_team_member(team_id, auth.uid())`.
- **Self-shortening guard** (3 layers) — client, API, and DB trigger reject destinations pointing to the platform's own hosts. Manage hosts via `platform_blocked_hosts` table.
- **Admin panel** — gated **server-side** in `src/app/admin/layout.tsx`: session auth + `users.is_admin` (redirects non-admins before render). Admin API routes also enforce `is_admin` with a 403. (The old client-side PIN was removed in the 2026-07-04 compliance fixes.)
- **API keys** — SHA-256 hashed, shown once, expiry + last-used tracked.
- **Rate limits** (in-memory, per-process):
  - `/api/v1/ab-tests` conversion: 30/min per IP
  - `/api/contact`: 5 / 10 min per IP
  - `/api/v1/*`: 120/min per API key

---

## 10. Known gotchas

- **1 cron/day cap** — if you add a new scheduled job, either piggyback on the existing anomaly cron or upgrade Vercel plan.
- **In-memory rate limits** reset on every Vercel cold start — they catch bursts, not determined spam. Move to Upstash/Redis when scaling.
- **Groq dependency** — if Groq is down, chat and weekly reports fail; the anomaly cron catches the error and still saves basic alerts (without AI enhancement).
- **Slug namespace is global** — `links.slug`, `collections.rotator_slug`, `ab_tests.slug` all compete for the same URL space. Name collisions are rejected by uniqueness constraints.
- **Brand drift** — some legacy screenshots show `linktw.in`. Canonical is `tappr.me`. Update `platform_blocked_hosts` if domains change.
- **Cross-instance refresh bus** — every hook in a dialog uses a separate `useState` from the hook in a list page, so the optimistic state update in the dialog doesn't reach the list. Fixed via a tiny in-process event bus at `src/lib/refresh-bus.ts`: every mutation `emit("links")` / `emit("collections")` / etc., and every list hook subscribes via `subscribe()`. Fires only on actual user actions, never on a timer/focus/realtime event.
- **Partner system** — full implementation per `tappr-partner-spec.html`; gated `/partner` shell, 25% recurring, admin-activated, see [partner-system.md](partner-system.md).

---

## 11. Where things are documented

This file is the overview. The other files in `docs/` are **historical feature notes** — one per fix or feature added during development. You only need them when tracing _why_ something was built a specific way. The useful ones to skim:

- `prevent-self-shortening.md` — 3-layer link-of-a-link guard
- `ab-testing-auto-winner-fixes.md` — A/B auto-winner bug fixes
- `new-alert-detectors.md` — the 3 added anomaly detectors
- `rules-dialog-ux.md` — country picker + date validation
- `contact-support.md` — contact form
- `floating-chat-persistence.md` — floating chat → Brain chat save
- `link-favorites.md` — sidebar favorites
- `realtime-anomaly-detection.md` — Supabase Realtime plumbing
- `admin-dashboard.md` — admin panel design

The `step-N-changelog.md` files (1–13) are the original build log — archival, not needed for handoff.

---

## 12. First things to do if you're taking over

1. Clone the repo, run `npm install`, copy `.env.local` keys from the previous owner.
2. Run `npm run dev`, confirm `/login` works end-to-end.
3. Verify the cron by hitting `/api/cron/anomaly-check` with the bearer secret — should return JSON.
4. Rotate secrets (`CRON_SECRET`, optionally Supabase service key). `NEXT_PUBLIC_ADMIN_PIN` is no longer used — delete it.
5. Check the Vercel project, confirm auto-deploy from `main` is wired.
6. Look at the latest migrations in `supabase/migrations/` to understand recent schema changes.

That's it. Questions or gaps? Look in the feature notes or grep the codebase — it's ~80 components and 17 hooks, not overwhelming.
