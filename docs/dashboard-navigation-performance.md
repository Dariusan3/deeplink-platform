# Dashboard navigation performance

## Symptom

Clicking between sidebar pages (`/dashboard/links` → `/dashboard/analytics`, etc.) felt slow.
The UI froze on the old page for several hundred milliseconds before the new one appeared —
no spinner, no skeleton, just a stall.

## Diagnosis

The pages themselves were not the problem. Every page under `src/app/(dashboard)/dashboard/`
is a client component reading from the providers mounted in the layout, so a transition
should have been near-instant. Three things on the server path made it not be.

### 1. No `loading.tsx` anywhere in the dashboard tree

`src/app/(dashboard)/layout.tsx` sets `export const dynamic = "force-dynamic"`, which makes
every dashboard route dynamic. Next only prefetches a dynamic route **down to its nearest
`loading` boundary** — and there was none. Two consequences:

- The sidebar's hover prefetch (`router.prefetch(item.href)` in `src/components/sidebar.tsx`)
  was effectively a no-op: there was no boundary to prefetch down to.
- On click, the navigation **blocked** on a full server round-trip with nothing to render in
  the meantime, so the old page stayed frozen on screen. This was the main cause.

### 2. Middleware made a network call to Supabase on every request

`src/middleware.ts` called `supabase.auth.getUser()`, which is a round-trip to the Supabase
Auth API and is not cached. The matcher catches everything, so this fired on every RSC
navigation request *and* every prefetch — sitting in front of every single page transition.

### 3. Router cache staleTime of 0 for dynamic segments

With `force-dynamic` and no `staleTimes` config, Next's default client router cache keeps
dynamic segments for 0 seconds. Navigating back to a page you were just on refetched its
entire RSC payload — including the layout's Supabase queries (profile, teams, links, and the
`team_link_click_counts` RPC).

## Fixes

### 1. `src/app/(dashboard)/dashboard/loading.tsx` (new)

A skeleton matching the shape every dashboard page shares (header bar, title block, stat
grid, content rows). Because it sits at the `dashboard/` segment, it acts as the Suspense
boundary for `/dashboard` and every route nested under it. This both re-enables prefetching
of the dashboard routes and gives the round-trip somewhere to land, so the shell paints
immediately instead of the old page hanging.

### 2. `next.config.ts` — `experimental.staleTimes`

```ts
experimental: {
  staleTimes: { dynamic: 30, static: 180 },
}
```

Returning to an already-visited sidebar page is now served from the client router cache
instead of refetching. Data does not go stale in any user-visible way: the providers
revalidate in the background, and `router.refresh()` / `revalidatePath()` bust this cache
immediately.

### 3. `src/middleware.ts` — `getUser()` → `getClaims()`

```ts
const { data: claimsData } = await supabase.auth.getClaims();
const user = claimsData?.claims ? { id: claimsData.claims.sub } : null;
```

**Security is unchanged.** This project's Supabase instance signs JWTs with an asymmetric key
— confirmed via `GET /auth/v1/.well-known/jwks.json`, which returns an `ES256` key. So
`getClaims()` verifies the token's signature locally against the cached JWK rather than
asking the Auth server who the user is. A forged or tampered token still fails verification.

Three properties worth stating explicitly, since this is auth code:

- **Session refresh still works.** `getClaims()` calls `getSession()` internally when no JWT
  is passed, so expired tokens are still refreshed and the rotated cookies still flow out
  through the existing `setAll()` handler.
- **It never trusts an unverified token.** If the project were ever migrated back to a
  symmetric (HS256) secret, or WebCrypto were unavailable, `getClaims()` falls back to a real
  `getUser()` call on its own.
- **The admin and partner guards are untouched.** They still do a live `users` table lookup
  for `is_admin` / `is_partner` keyed off the verified `claims.sub`.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next build` — compiled successfully, 64 static pages generated, no config warnings.
  (`· staleTimes` appears under Next's "Experiments (use with caution)" list; that is an
  acknowledgement, not a warning.)
- Auth guards re-checked against the dev server while logged out:
  `/dashboard`, `/admin` and `/partner` all still `307 → /login`; `/login` still `200`.

## Files changed

- `src/app/(dashboard)/dashboard/loading.tsx` (new)
- `next.config.ts`
- `src/middleware.ts`
