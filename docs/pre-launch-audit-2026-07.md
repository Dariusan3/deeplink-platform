# Pre-launch audit — compliance + security (2026-07-26)

Combined GDPR/EU-AI-Act compliance audit and manual security review ahead of
launch. This documents what was checked, what was fixed in code, and what the
operator must still do outside the repo.

## Compliance — result: low risk

The privacy policy genuinely matches what the code does (rare). Verified:

- **Sub-processor table complete** (`src/app/privacy/page.tsx:98-137`): Supabase,
  Vercel, Groq, Resend, Fanbasis, Meta/Instagram, Google — all named with data
  categories and transfer regions.
- **IP retention is real, not just promised.** Policy claims 90-day IP removal;
  `src/lib/prune-click-logs.ts` (`CLICK_LOG_RETENTION_DAYS = 90`) nulls
  `ip_address` + `user_agent` past the cutoff on both `link_clicks` and the
  partner click table. Runs inside the daily anomaly-check cron.
- **Right to erasure implemented** (`src/app/api/account/delete/route.ts`):
  cascades from `auth.users`, deactivates IG tokens first, anonymises partner
  financial records (keeps amounts, scrubs PII).
- **AI disclosure present in UI** (`src/components/dashboard/floating-chat.tsx:372`,
  `src/app/(dashboard)/dashboard/brain/page.tsx:745`) — "Responses are
  AI-generated (Groq)". Satisfies EU AI Act Art. 50 (applies 2026-08-02).
- **AI provider matches:** code uses Groq (`groq-sdk`), policy says Groq.
  `@anthropic-ai/sdk` appears only in `robots.ts` (bot user-agent string), not an
  AI call — no undisclosed processor.

Open compliance item (operator, not code): confirm real legal entity name +
address in the policy and that `privacy@tappr.me` is a monitored mailbox.

## Security — fixes applied in this pass

### 1. Cron routes now fail closed (was fail-open)
All three cron routes gated auth with `if (cronSecret && ...)`, so an **unset**
`CRON_SECRET` in production would have left them fully public — including
`prune-click-logs`, which destructively nulls PII. Changed to block when the
secret is missing:

- `src/app/api/cron/tier1-alerts/route.ts`
- `src/app/api/cron/prune-click-logs/route.ts`
- `src/app/api/cron/anomaly-check/route.ts`

```ts
if (!cronSecret) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
if (authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### 2. Removed dead `NEXT_PUBLIC_ADMIN_PIN`
The admin gate is already server-side (`src/app/admin/layout.tsx` checks
`is_admin`); the old client PIN was removed earlier. The leftover
`NEXT_PUBLIC_ADMIN_PIN` env var was dead — removed from `.env.local`.

## Verified clean (no change needed)

- Public write endpoints **already rate-limited**: `v1/ab-tests` 30/min/IP,
  `partner/track-click` 60/min/IP (in-memory, per-IP).
- Service-role key used only in server routes, never `NEXT_PUBLIC`.
- Admin UI gate is server-side; non-admins redirected before any markup.
- Open-redirect neutralised — `ensureAbsoluteUrl` forces an `https://` prefix.
- `partner/validate-code` returns only a boolean (no PII, no code leak).
- Secrets safe from git: `.env*` is gitignored, no `.env` file ever tracked.

## Still on the operator (outside the repo)

1. **Set a strong `CRON_SECRET` in Vercel.** Local value is `supersecret` — now
   that the routes fail closed, a guessable secret is the weak link. Use a long
   random value in prod.
2. **Remove `NEXT_PUBLIC_ADMIN_PIN` from Vercel env** too (only the local copy was
   removed here).
3. **Run the Supabase security advisor / linter** to confirm RLS is enabled on
   every table (21 `ENABLE ROW LEVEL SECURITY` statements exist across migrations;
   coverage per-table was not verifiable from code alone). Service-role routes
   bypass RLS, so any table with RLS off is exposed to direct client queries.
4. **Confirm legal entity + `privacy@tappr.me` mailbox** for the privacy policy.

## Residual risk (accepted for launch)

- Rate limiters are in-memory per serverless instance — they slow naive abuse but
  a distributed attacker across instances is only throttled, not stopped. Move to
  a durable store (e.g. Upstash Redis) if referral-payout or A/B fraud becomes a
  real target.
