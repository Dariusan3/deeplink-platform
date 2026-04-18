# Prevent Self-Shortening

## Rule
Users cannot create a deeplink whose destination URL points back to the platform's own domain. This blocks the "shorten a short-link" loop that would otherwise cause redirect chains, inflated analytics, and loops.

## Implementation
Both link-creation entry points now validate the destination hostname against `window.location.hostname` before calling `createLink`.

- [src/components/links/create-link-dialog.tsx](../src/components/links/create-link-dialog.tsx) — full create dialog (`isOwnDomain` guard in `handleSubmit`)
- [src/components/dashboard/quick-create.tsx](../src/components/dashboard/quick-create.tsx) — dashboard quick-create card (`isOwnDomain` guard in `handleCreate`)

If the destination matches the platform's hostname, we toast an error and abort before inserting the row.

## Defense in depth

Three independent layers now enforce the rule:

1. **Client (UI)** — [create-link-dialog.tsx](../src/components/links/create-link-dialog.tsx) and [quick-create.tsx](../src/components/dashboard/quick-create.tsx) compare `new URL(dest).hostname` to `window.location.hostname`.
2. **API (REST)** — [/api/v1/links POST](../src/app/api/v1/links/route.ts) and [/api/v1/links/:id PATCH](../src/app/api/v1/links/[id]/route.ts) compare `new URL(dest).hostname` to `request.nextUrl.hostname` and return 400.
3. **Database (trigger)** — [migration 013](../supabase/migrations/013_prevent_self_shortening.sql) installs `links_block_self_shortening` BEFORE INSERT/UPDATE trigger that extracts the hostname via regex and rejects it if it appears in `public.platform_blocked_hosts`. Seeded with `linktw.in`, `dplnk.co`, `tappr.me` (± `www.`).

The DB trigger is the last line of defense — it catches direct Supabase inserts, bulk imports, SQL patches, and anything else that bypasses the app layer. Add new platform hosts by inserting into `public.platform_blocked_hosts`.

## Notes
- Client + API checks use exact hostname match against the current request host, so subdomains of the platform (e.g. `app.linktw.in` → `linktw.in`) are intentionally *not* blocked at those layers.
- The DB trigger is a host-list match, so update `platform_blocked_hosts` whenever the platform is served on a new domain.
