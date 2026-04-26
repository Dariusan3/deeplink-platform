# Partner System

Complete partner program implementation per [tappr-partner-spec.html](../tappr-partner-spec.html). Activated manually by admin, separate `/partner` route shell, 25% recurring commission, full self-service dashboard.

## Migration

[supabase/migrations/015_partner_system.sql](../supabase/migrations/015_partner_system.sql) creates everything in one migration. Apply via Supabase SQL editor before deploying.

**Tables added:**
- `partner_profiles` — one per activated partner; holds `referral_code`, `commission_rate` (default 0.25), `total_earned`, `pending_payout`, `payout_method` (jsonb)
- `partner_referrals` — one per signup that came through a referral link; status flows pending → active → churned
- `partner_earnings` — credit log, one row per partner per month per referral
- `partner_payouts` — withdrawal requests + admin processing
- `partner_suggestions` — community roadmap
- `partner_suggestion_votes` — junction table preventing double-voting (RPC `partner_vote_suggestion` keeps `votes` in sync atomically)
- `partner_referral_clicks` — every click on a referral link, with country/device

**Columns on `users`:** `is_partner BOOLEAN`, `partner_activated_at TIMESTAMPTZ`.

**RLS:** All partner tables are RLS-enabled. Partners only see their own rows; suggestions are visible to all partners (community board); admins use the service-role client to manage everyone.

**Realtime publication:** `partner_referrals`, `partner_referral_clicks`, `partner_payouts` are added so the partner dashboard pushes live notifications (toast on new signup / conversion / payout).

## Routing

```
tappr.me/?ref=<code>  →  landing page logs click + stashes code
                         → signup page reads ?ref + passes through user_metadata
                         → auth callback creates partner_referrals row
                         → admin/billing later flips status to "active" + writes earnings
```

The Google OAuth path can't use `user_metadata`, so the signup page additionally writes `tappr_ref_code` to localStorage; the dashboard shell mounts `<ReferralClaim />` which POSTs to `/api/partner/claim-referral` once on first authenticated load.

## Admin

[/admin/users](../src/app/admin/users/page.tsx) gains an **Activate Partner / Deactivate Partner** chip per user (mirrors the existing Make Admin / Remove Admin pattern). Activation calls `POST /api/admin/partner/activate`:
1. Generates an 8-char unique referral code
2. Inserts a `partner_profiles` row (commission_rate = 0.25)
3. Sets `users.is_partner = true`
4. Sends the welcome email via Resend

Payouts are approved via `PATCH /api/admin/partner/payout` with `{ payout_id, status: "paid" | "rejected", reference }`. On `paid`: decrements `pending_payout`, increments `total_earned`, marks all pending earnings as paid, sends confirmation email.

## Partner UI (`/partner`)

Gated by middleware (`is_partner === true`); otherwise redirects to `/dashboard`. Dedicated sidebar — separate from the main app — with 9 pages:

| Page | Purpose |
|---|---|
| `/partner` | Overview — 4 metric cards, payout banner, quick-copy link, recent activity |
| `/partner/link` | Referral URL + QR (downloadable) + 14-day click stats + geo/device breakdown |
| `/partner/referrals` | Sortable table, filter by status, MRR + your-cut header |
| `/partner/earnings` | 12-month bar chart, payout request form (min $50), payout history |
| `/partner/stats` | Click → signup → conversion funnel + top countries + device split |
| `/partner/leaderboard` | Top 10 anonymous + your rank highlighted |
| `/partner/promo` | Copy-paste templates for IG/LinkedIn/DM/email with link interpolated |
| `/partner/suggestions` | Submit + vote on roadmap items (RPC dedupes votes) |
| `/partner/settings` | Account info + PayPal / bank-transfer payout method |

Sidebar entry on the regular dashboard surfaces a **Partner** CTA only when `is_partner = true`.

## Hooks

- [use-partner.ts](../src/hooks/use-partner.ts) — single hook backing every page; loads profile + referrals + earnings + payouts + suggestions in parallel; subscribes realtime; exposes mutations (`updatePayoutMethod`, `requestPayout`, `submitSuggestion`, `voteSuggestion`)
- [use-partner-stats.ts](../src/hooks/use-partner-stats.ts) — thin fetch wrappers around `/api/partner/stats` and `/api/partner/leaderboard`

Both use the existing `refresh-bus` pattern (`partner-data` resource) so cross-instance state stays in sync after mutations.

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/partner/track-click` | POST | Public; logs a referral click (rate-limited 60/min/IP) |
| `/api/partner/claim-referral` | POST | Authed; OAuth fallback to associate user with referral code from localStorage |
| `/api/partner/payout-request` | POST | Authed; partner requests withdrawal (≥ $50, payout method required) |
| `/api/partner/stats` | GET | Authed; aggregates clicks/signups/conversions + geo + device |
| `/api/partner/leaderboard` | GET | Authed; top 10 anonymized + caller's rank |
| `/api/admin/partner/activate` | POST | Admin; creates partner_profile + sends welcome |
| `/api/admin/partner/activate` | DELETE | Admin; deactivates partner (data retained) |
| `/api/admin/partner/payout` | PATCH | Admin; marks payout paid/rejected + sends confirmation |

Direct reads (profile, referrals, earnings, payouts, suggestions) go straight from the browser through Supabase RLS — no thin API wrappers.

## Emails (Resend)

All in [src/lib/email.ts](../src/lib/email.ts), all using the same dark Tappr-branded shell:

- `sendPartnerWelcomeEmail` — on activation, includes referral URL
- `sendPartnerReferralConvertedEmail` — fired by billing logic when a referral upgrades (not yet wired into Stripe — see TODO)
- `sendPartnerPayoutConfirmedEmail` — admin marks payout paid
- `sendPartnerMonthlyReportEmail` — earnings/referrals/balance recap

## Cron

The existing daily anomaly cron now does the **partner monthly report** as a piggyback: only fires on the 1st of the month, queries each partner's previous-month earnings + new referrals + active count, sends the recap email. Skips silent partners (no activity, zero balance).

## Open TODOs

- **Earnings creation pipeline** — there's no automated process yet that writes `partner_earnings` rows when a referred user pays. Today this happens only manually. Wire into the future Stripe webhook (or use Supabase function on `subscriptions` insert) to call something like `recordPartnerEarning(referral_id, amount)`.
- **`partner_referrals.status → active` flip** — same gap; the conversion email and earnings depend on this happening on first paid invoice. Today admins flip it manually.
- **Promo banners (downloadable images)** — the spec lists 1080×1080 + story-format banners. The current promo page only ships text templates. Designer can drop PNGs into `public/partner-promo/` and we render them in a download grid.
