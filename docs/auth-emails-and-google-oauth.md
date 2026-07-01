# Branded auth emails (Resend) + Google OAuth — setup

## What was built (code — done)

- **`src/lib/auth-emails.ts`** — branded HTML for every Supabase auth email
  (confirm signup, reset password, invite, magic link, email change,
  reauthentication code). Same dark card + `#00D26A` accent as the product
  emails in `src/lib/email.ts`. Sent from `accounts@tappr.me` via Resend.
- **`src/app/api/auth/send-email/route.ts`** — the Supabase **Send Email
  Hook** endpoint. Verifies the Standard Webhooks signature, rebuilds the
  same verification URL Supabase's default templates use
  (`{SUPABASE_URL}/auth/v1/verify?token=…&type=…&redirect_to=…`), and sends
  the branded email through Resend.

Once the hook is enabled (below), Supabase stops sending its plain default
emails and calls this endpoint instead.

## Email-link routing — `/auth/confirm` (recovery fix)

**Problem:** the password-reset (and confirm) links were landing on the
**dashboard** instead of the reset-password form. Cause: they went through
`/auth/callback` + Supabase's hosted verify, and when the `redirect_to`
didn't match Supabase's redirect-URL allowlist, Supabase silently fell back
to the **Site URL** → the dashboard.

**Fix (in code):** the branded emails now link to our own
**`/auth/confirm?token_hash=…&type=…&next=…`** route. It calls
`verifyOtp(token_hash)` server-side (sets the session) and redirects
deterministically:
- `recovery` / `invite` → **`/reset-password`** (set a new password)
- `signup` / `magiclink` / `email_change` → **`/dashboard`**

`/auth/callback` now handles only the OAuth (Google) `code` flow. Because
`/auth/confirm` does its own redirect, it no longer depends on the Supabase
allowlist.

> If you keep Supabase's DEFAULT emails (hook disabled), the old allowlist
> issue still applies — so also add `https://tappr.me/**` under Auth → URL
> Configuration → Redirect URLs. With the hook enabled, the branded emails
> use `/auth/confirm` and are allowlist-independent.

## 1) Env vars to add (Vercel + local `.env.local`)

```
# The secret Supabase shows when you create the Send Email hook (starts with v1,whsec_…)
SEND_EMAIL_HOOK_SECRET=v1,whsec_xxxxxxxxxxxxxxxxxxxx
# Optional — sender for auth emails (defaults to "Tappr <accounts@tappr.me>")
RESEND_AUTH_FROM_EMAIL=Tappr <accounts@tappr.me>
```

`RESEND_API_KEY` and `NEXT_PUBLIC_SUPABASE_URL` already exist and are reused.

## 2) Enable the Send Email hook in Supabase

Dashboard → **Authentication → Hooks** → **Send Email hook**:
- Type: **HTTPS**
- URL: `https://tappr.me/api/auth/send-email`
- Click generate secret → copy it into `SEND_EMAIL_HOOK_SECRET` (Vercel env),
  redeploy.
- Enable the hook.

Also check **Authentication → URL Configuration**:
- **Site URL**: `https://tappr.me`
- **Redirect URLs** allowlist includes: `https://tappr.me/**`
  (covers `/auth/callback` and `/reset-password`).

Test: trigger a password reset from `/forgot-password` on prod → you should
get the branded email; the button opens `/auth/callback?next=/reset-password`.

## 3) DNS — REQUIRED: verify `tappr.me` in Resend ⚠️

**Correction:** `tappr.me` is **NOT** verified in Resend yet. Confirmed via a
direct send test — Resend returned:
`403 "The tappr.me domain is not verified"`. Until it's verified, Resend only
delivers to the account owner's own address (`darius.osadici@yahoo.ro`) and
rejects everything else. **This also means the existing product emails
(alerts, A/B, contact) currently fail to real users too.**

### Steps
1. Resend dashboard → **Domains → Add Domain** → enter `tappr.me`.
2. Resend shows a set of DNS records — add them at your DNS provider (the one
   managing tappr.me). They are **account/region-specific**, so copy the exact
   values from Resend's screen. They look like:

| Type | Name / Host | Value | Notes |
| --- | --- | --- | --- |
| TXT | `send.tappr.me` (or `@`) | `v=spf1 include:amazonses.com ~all` | SPF |
| MX  | `send.tappr.me` | `feedback-smtp.<region>.amazonses.com` (priority 10) | bounce handling |
| TXT | `resend._domainkey.tappr.me` | (long DKIM public key from Resend) | DKIM |
| TXT | `_dmarc.tappr.me` | `v=DMARC1; p=none;` | DMARC (recommended) |

3. Back in Resend, click **Verify**. Propagation is usually minutes (can take
   up to a few hours).
4. Once green/verified, `accounts@tappr.me` (and `alerts@tappr.me`) send to
   anyone. Re-run the local test to a Gmail address to confirm.

> Send me a screenshot of Resend's records screen and I'll map each one to the
> exact entry to create at your DNS provider.

### Testing before the domain is verified
Resend's sandbox lets you send **only to your own Resend account email**
(`darius.osadici@yahoo.ro`) using `onboarding@resend.dev` as the sender. The
branded signup + recovery emails were already sent there successfully — that
proves the code path works; only domain verification is left.

## 4) Google OAuth — the CODE is already done

`signInWithOAuth({ provider: "google" })` is wired on `/login`, and
`/auth/callback` exchanges the code. What's missing is the **provider
config** (not code):

### a) Google Cloud Console
- APIs & Services → **Credentials** → Create **OAuth client ID** → type
  **Web application**.
- **Authorized redirect URI**:
  `https://xovmaoicmzhvfsbgnhgg.supabase.co/auth/v1/callback`
  (Supabase's callback — NOT tappr.me).
- (OAuth consent screen must be configured/published — app name, logo,
  support email, `tappr.me` as authorized domain.)
- Copy the **Client ID** + **Client secret**.

### b) Supabase
- Dashboard → **Authentication → Providers → Google** → enable → paste the
  Client ID + Secret → save.
- Confirm **URL Configuration** (same as step 2) so the post-login redirect
  to `https://tappr.me/auth/callback` is allowlisted.

### c) Test
Prod `/login` → "Continue with Google" → consent → lands on `/dashboard`.

> Note: the `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` vars in `.env.local` only apply
> to the local Supabase CLI stack — hosted Google config lives in the
> dashboard, not env vars.

## Notes

- Team invites (`useTeamMembers.inviteMember`) currently add an existing user
  to a team directly and send **no email**. If you want a branded "You were
  added to team X" email, that's a separate Resend send (not a Supabase auth
  email) — say the word and I'll add it.
