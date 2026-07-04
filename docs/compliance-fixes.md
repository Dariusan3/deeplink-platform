# Compliance Fixes — GDPR & EU AI Act

Implemented **2026-07-04** in response to [`compliance-audit.md`](./compliance-audit.md).
Every finding in the audit that could be fixed in-repo has been addressed. Below is
what changed, why, and what you still need to do by hand before relying on it.

> ⚠️ Indicative guidance, not legal advice. These changes get you most of the way;
> have a professional review the policy text before you depend on it for anything
> high-stakes.

---

## What changed

### 1–2, 7 · Privacy policy, sub-processor list & transfers (🔴 → resolved)
- **New page `/privacy`** — `src/app/privacy/page.tsx`. A real GDPR/UK-GDPR policy
  generated from the audited reality: exactly what data is collected, a
  **sub-processor table** (Supabase, Vercel, Groq, Resend, Fanbasis, Meta/Instagram,
  Google), international-transfer language (SCCs / Data Privacy Framework), retention,
  rights, cookies, children.
- **New page `/terms`** — `src/app/terms/page.tsx`. Baseline terms of service.
- **New shared chrome** — `src/components/legal/legal-shell.tsx` (Nav + Footer +
  `.legal-prose` styling added to `src/app/globals.css`).
- The footer already linked `/privacy` and `/terms` — those links were **dead (404)**
  and now resolve. No footer change needed.

### 3 · Right to erasure — delete my account (🔴 → resolved)
- **New API route** — `src/app/api/account/delete/route.ts`. `POST` deletes the
  signed-in user via the Supabase admin API. Because the schema cascades from
  `auth.users` → `public.users` → teams/links/clicks/brain/ig/reports, one delete
  removes everything. Instagram integrations owned by the user are deactivated first.
- **New UI** — a **Danger Zone** card + type-`DELETE`-to-confirm dialog in
  `src/app/(dashboard)/dashboard/settings/page.tsx`. On success the user is signed
  out and sent to `/login`.
- **Caveat:** if a user owns a team with *other* members, the cascade removes that
  team too. Fine for the current single-owner model — revisit if shared team
  ownership becomes real.

#### Account deletion & the partner system
Follow-up review of the partner/referral tables (`015_partner_system.sql`):
- **PII is erased correctly.** All `partner_*` tables cascade from `users`, so a
  deleted user's partner profile, referrals (incl. `referred_email`), earnings and
  payouts are removed — and their rows on *other* partners cascade away too, which
  strips the referred person's PII. No orphaned personal data.
- **Money counters are safe.** `partner_profiles.total_earned` / `pending_payout` are
  independent columns maintained by the billing webhook + admin payout route; deleting
  a referred user doesn't corrupt them (the partner keeps earned commission). The live
  referral *count* drops by one — cosmetic only.
- **Two FKs blocked deletion — fixed by `022_account_deletion_fks.sql`.**
  `collections.created_by` and `subscriptions.granted_by` referenced `users` with no
  `ON DELETE` rule (NO ACTION), so erasure failed with an FK violation for users who
  created collections in another team, or admins who granted plans. The migration
  switches both to `ON DELETE SET NULL`. **Apply this migration**, or those users
  can't delete their account.

**Decision (chosen): anonymise partner financial records, keep the amounts.**
Instead of hard-deleting a partner's history on account deletion, we retain it for
accounting/tax (GDPR Art. 17(3)(b)) with the personal data stripped:
- **Migration `023_partner_anonymize_on_delete.sql`** — switches
  `partner_profiles.user_id` to `ON DELETE SET NULL` (+ adds `anonymized_at`), so the
  profile row and everything cascading from it (earnings, payouts) **survive** the
  user's deletion instead of being wiped.
- **`/api/account/delete`** — before deleting the user, if they're a partner it scrubs
  the PII the DB can't: nulls `payout_method` (bank/PayPal details), stamps
  `anonymized_at`, and replaces `referred_email` on their referrals with `[deleted]`.
  Amounts, `referral_code` and status are preserved.
- Net result: you keep a complete record of what you earned/paid each partner, with no
  personal identifiers attached. **Apply migration 023** for this to work.

### 4 · Admin panel secret leak (🔴 → resolved)
- **`src/app/admin/layout.tsx`** is now a **server component** that checks the session
  and `is_admin` server-side and redirects non-admins before any admin markup renders.
- Removed the client-side PIN gate that read `NEXT_PUBLIC_ADMIN_PIN` (shipped into the
  browser bundle) with a hardcoded `"tappr2026"` fallback.
- Interactive nav moved to `src/components/admin/admin-shell.tsx` (presentational only).
- The admin **API** routes already enforced `is_admin` with a 403 — data was never
  exposed; this closes the UI side of the same door.
- **You can now delete `NEXT_PUBLIC_ADMIN_PIN` from `.env.local` / Vercel env** — it's
  no longer read anywhere.

### 5 · AI disclosure — EU AI Act Art. 50 (🟠 → resolved)
- AI Brain (`src/app/(dashboard)/dashboard/brain/page.tsx`) and the floating chat
  (`src/components/dashboard/floating-chat.tsx`) now show
  **"Responses are AI-generated … and may be inaccurate"** under the input.
- The weekly report component already disclosed "Generated by Llama 3.3 70B via Groq" —
  left as-is.
- Art. 50 transparency applies from **2 August 2026**; this is in place ahead of it.

### 6 · IP-log retention (🟠 → resolved)
- **New shared helper** — `src/lib/prune-click-logs.ts`. Anonymises `ip_address` +
  `user_agent` on `link_clicks` and `ab_test_events` older than **90 days**, keeping the
  row so aggregate country/device/trend analytics still work. Matches the retention
  promise in the privacy policy.
- **Runs daily** by piggybacking on the existing `anomaly-check` cron — the README notes
  Vercel Hobby caps scheduled jobs, so retention deliberately does **not** add a second
  cron entry.
- **Also exposed standalone** at `src/app/api/cron/prune-click-logs/route.ts` for manual
  runs / external schedulers (same `Bearer ${CRON_SECRET}` auth).

---

## Still open (needs a human)

- **🟠 #8 — Instagram tokens stored in plaintext** (`src/app/api/ig/callback/route.ts`).
  Not auto-fixed: encrypting at rest needs a key-management decision (Supabase Vault or
  an app-level encryption key). Recommended next step.
- **🟡 #9 — data-export path.** Rights are honoured via delete + contact; a self-serve
  export is still a nice-to-have.

## Before you publish

1. In **`/privacy`** and **`/terms`**, replace every **`【bracketed】`** placeholder:
   legal entity name, registered address, governing jurisdiction.
2. Confirm the contact addresses (`privacy@tappr.me`, `hello@tappr.me`) exist and route
   to you.
3. Have the policy text reviewed by a professional if the stakes warrant it.
4. Remove `NEXT_PUBLIC_ADMIN_PIN` from your environment variables.
5. After deploy, confirm the new cron shows up in Vercel → Crons and that
   `CRON_SECRET` is set in the environment.

## Migrations applied
Both deletion-related migrations were applied to the live Supabase project
`deeplink-platform` (`xovmaoicmzhvfsbgnhgg`) on **2026-07-04** and verified:
- `022_account_deletion_fks` — `collections.created_by` & `subscriptions.granted_by`
  → `ON DELETE SET NULL` (both were NO ACTION). Confirmed.
- `023_partner_anonymize_on_delete` — `partner_profiles.user_id` → `ON DELETE SET NULL`
  (was CASCADE) + `anonymized_at` column. Confirmed.

The retention/cleanup logic (`link_clicks` / `ab_test_events` anonymisation) needs no
migration — it runs against existing columns via the daily cron.

## Verification done
- `npx tsc --noEmit` — passes clean.
- `npx eslint` on all new/changed files — 0 errors (pre-existing warnings in untouched
  code left alone).
- Migrations 022 & 023 applied to production and FK states re-queried to confirm.
