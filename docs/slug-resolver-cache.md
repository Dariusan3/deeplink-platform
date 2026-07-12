# Slug resolver cache

## Context

Before this change the codebase had **no server-side cache at all** — no `unstable_cache`,
no `revalidate`, no `Cache-Control`, no Redis/Upstash/KV. Every short-link click ran the full
slug lookup against Supabase.

`src/app/[slug]/route.ts` is the product's hot path. Each click did three parallel Supabase
queries (`collections` for a rotator slug, `ab_tests`, `links`), plus a fourth query for the
rotator's member links when the slug was a rotator. Measured against the dev server, a
redirect cost roughly 150–600ms end to end, most of it the Supabase round-trip.

## What is cached

`src/lib/link-cache.ts` wraps the whole lookup in `unstable_cache`, keyed by slug and tagged
`slug:<slug>`, with a **60 second TTL**.

Only the *lookup* is cached — which rows in the database correspond to this slug. Everything
that depends on the individual request still runs fresh on every single hit:

- the rotator's random pick among its member links
- the A/B test's 50/50 split
- geo / device / time redirect-rule evaluation
- click tracking (`link_clicks`, `ab_test_events` inserts and the counter RPCs)

Deliberately **not** cached: `team_settings`. It is only read on the paused-link and TikTok
in-app-browser branches, which are rare, so caching it would buy nothing while adding
invalidation surface.

## Why a TTL *and* tag invalidation

This is the load-bearing design decision, so it is worth stating plainly.

Tags give instant invalidation on the write paths we know about — pause a link, repoint a
destination, pick an A/B winner. But links are written from several places, and **some of them
are client components talking to Supabase straight from the browser**
(`src/providers/links-provider.tsx`, `src/hooks/use-ab-tests.ts`, `src/hooks/use-collections.ts`).
Those cannot call `revalidateTag` — it is server-only. They go through
`POST /api/cache/revalidate` instead, and that call can fail.

So the 60s TTL is the safety net, on purpose. If an invalidation is ever missed — a call site
nobody wired up, a failed request, a write path added later — staleness is **bounded** rather
than permanent. That bound is the whole reason this is safe to put on the money path.

### What the TTL actually guarantees (measured, not assumed)

`revalidate: 60` on `unstable_cache` is **stale-while-revalidate**, not a hard expiry. This was
measured: 65 seconds after the entry was written, the next request still returned in ~14ms —
no database round-trip in the response path. It served the stale entry and kicked off a
background refresh.

So the honest guarantee is: **stale for up to 60s, plus one more request.** After the TTL
elapses, the first click still sees old data and triggers the refresh; the click after that
sees fresh data. It is bounded, but it is not "everything is correct after exactly 60s."

This is why the tag invalidation path uses `{ expire: 0 }` rather than relying on the TTL. For
the cases users actually notice — pausing a link, repointing a destination — we purge outright
so the very next click is correct. The TTL is the backstop for the cases we missed, not the
primary mechanism.

## Invalidation map

Every write that can change what a slug resolves to:

| Where | Writes | Invalidates |
|---|---|---|
| `providers/links-provider.tsx` (client) | create / update / delete link | link slug (old + new), its collection's rotator slug |
| `hooks/use-ab-tests.ts` (client) | create / update / delete test, select winner | test slug (old + new) |
| `hooks/use-collections.ts` (client) | create / update / delete collection, move links | rotator slug (old + new), both collections on a move |
| `api/v1/links/route.ts` (server) | create link | new slug |
| `api/v1/links/[id]/route.ts` (server) | update / delete link | slug (old + new), collection's rotator slug |
| `lib/ai-tools.ts` (server) | create / update / move / bulk-update links | affected slugs; all team rotators on bulk |
| `lib/ab-testing.ts` (server) | auto-select A/B winner | test slug |

Three cases are easy to get wrong and are handled explicitly:

**Invalidate on create, not just update.** If anyone hit a slug *before* the link existed, the
resolver cached a "no such slug" resolution for it. That negative entry would keep 404ing the
brand-new link until it aged out.

**The old slug, not just the new one.** An edit can rename a slug. The pre-update row has to be
read before the write lands, or the old short link keeps resolving to the old destination.

**Rotator membership is a separate cache key.** A link inside a rotator collection is also
reachable through the collection's own `rotator_slug`, which is its own cache entry. Pausing a
link inside a rotator must also purge the rotator, or the rotator keeps handing the paused link
out. On a move, *both* the collection it leaves and the one it joins are affected — and the old
one is unknowable once the update lands, so it is read first.

`hooks/use-settings.ts` (team settings) and `toggleFavorite` are intentionally **not** wired up:
neither touches a field the resolver reads.

## Known, accepted staleness

The cached `ab_tests` row includes the visit/conversion counters, and
`finalizeABWinnerIfReady()` reads them to decide whether a winner is ready. Those counts can
therefore be up to 60s behind.

This delays auto-winner selection by at most one TTL; it cannot make it *wrong*. Stale counts
are always *under*-counts, which is conservative against the `min_conversions` threshold — the
function can only decide late, never early. The winner update is also guarded by a conditional
`.is("winner", null)`, so concurrent requests can't double-select.

## The invalidation endpoint

`POST /api/cache/revalidate`, body `{ slugs?: string[], collectionIds?: string[] }`.

Auth: caller must be signed in, and that is the bar on purpose. The only thing this endpoint
can do is *discard* a cache entry — nothing is returned and nothing is mutated — so the worst an
authenticated user can do with someone else's slug is force one extra DB read on the next click.
A per-slug ownership check would cost a query on every write to defend against nothing.

The auth check runs before the body is parsed, so an unauthenticated caller gets a 401 without
the endpoint revealing anything about its input handling.

`collectionIds` exists because the browser knows a link's `collection_id` but not the
collection's `rotator_slug`; the server resolves that.

## Next 16 API notes

- `revalidateTag(tag, profile)` — the second argument is **required** in Next 16 and caps how
  stale an entry may be served while it revalidates. We pass `{ expire: 0 }`: purge now, serve
  nothing stale. When someone pauses a link, the very next click must see it.
- `unstable_cache` is still the right tool here; the `use cache` directive would require
  turning on the `cacheComponents` flag, which is a much larger change.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next build` — compiled successfully, 65 static pages.
- **Cache confirmed working**, same slug hit repeatedly against the dev server:
  `1.07s` cold → `~13ms` on every subsequent hit. The Supabase round-trip is gone.
- **Endpoint auth confirmed**: unauthenticated `POST /api/cache/revalidate` returns `401`,
  including for a malformed body (the auth check runs before the body is parsed).
- **TTL measured, and it did not behave the way I first assumed** — see the
  stale-while-revalidate section above. 65s after the write, the request was still served from
  cache in ~14ms. The doc originally claimed the entry expires hard at 60s; that was wrong and
  has been corrected.

### Not verified

Two things could not be exercised from a shell and are worth a manual smoke test:

1. **An authenticated dashboard write actually purging the entry.** This needs a real browser
   session. The pieces are individually sound — the endpoint works, the tag strings match
   between writer and reader — but the round trip is unproven. Smoke test: pause a link in the
   dashboard, then click it. It should land on `/paused` immediately, not a minute later.
2. **That a cached entry does eventually refresh from the database.** Proving this needs a
   write to the live Supabase project (create a link at a slug that was already cached as "not
   found", then watch it start resolving), which I did not do unprompted. The behaviour is
   standard Next data-cache semantics, but it is assumed here, not measured.

## Files changed

- `src/lib/link-cache.ts` (new) — cached lookup + invalidation helpers
- `src/lib/revalidate-slug.ts` (new) — client-side fire-and-forget invalidation
- `src/app/api/cache/revalidate/route.ts` (new) — authed invalidation endpoint
- `src/app/[slug]/route.ts` — uses the cached lookup
- `src/providers/links-provider.tsx`, `src/hooks/use-ab-tests.ts`, `src/hooks/use-collections.ts`
- `src/app/api/v1/links/route.ts`, `src/app/api/v1/links/[id]/route.ts`
- `src/lib/ai-tools.ts`, `src/lib/ab-testing.ts`
