# Dashboard Performance Optimizations

Problem: the dashboard (and other sections) loaded slowly because data
resolved through a 4-level **client** provider waterfall on every visit:

```
UserProvider (getSession)
  → TeamProvider (fetch teams)
    → LinksProvider (fetch links + click counts)
      → useClickStats (RPC + recent clicks)
```

Each level waited on the previous one and each was a separate network
round-trip from the browser. On a cold load that's 4 sequential hops before
the page paints real data.

Four changes address this — three "safe, high-impact" client-side caches
plus the deeper Server Components seed.

## 1. localStorage stale-while-revalidate caches

Each provider/hook now hydrates its state from a per-team localStorage
snapshot on mount, paints instantly, then revalidates in the background and
rewrites the cache. No skeleton is shown when a cache exists.

| Data | File | Cache key |
| --- | --- | --- |
| Teams | `src/providers/team-provider.tsx` | `tappr_teams_cache` |
| Links (+ click counts) | `src/providers/links-provider.tsx` | `tappr_links_cache_<teamId>` |
| Dashboard stats (totals, 14-day chart, recent clicks) | `src/hooks/use-click-stats.ts` | `tappr_stats_cache_<teamId>` |
| Collections | `src/hooks/use-collections.ts` | `tappr_collections_cache_<teamId>` |

A `hasDataRef` (or `!readCache()`) guard prevents flashing a loading
skeleton over cached content. Caches are cleared on logout and, for stats,
when a team has no links.

## 2. Sidebar hover prefetch

`src/components/sidebar.tsx` calls `router.prefetch(item.href)` on
`onMouseEnter` for each nav link, warming the route bundle before the click
so navigation is instant.

## 3. Server Components seed (initialData)

`src/app/(dashboard)/layout.tsx` is a Server Component. It now fetches
up-front, server-side, in parallel:

- the authenticated user (`supabase.auth.getUser()`)
- the user profile
- the user's teams
- the active team's links + click counts (RPC `team_link_click_counts`)

…and passes them into the (still client) providers as `initialData`:

- `UserProvider` → `initialUser`, `initialProfile`
- `TeamProvider` → `initialTeams`, `initialActiveTeam`
- `LinksProvider` → `initialLinks`

The providers seed their `useState` from these props (deterministic across
SSR + client hydration → no mismatch), set `loading = false`, and still run
their existing effects to revalidate + keep realtime subscriptions. This
collapses the cold-load client waterfall — the first HTML already contains
the user's teams and links.

### Active team via cookie

The server can't read `localStorage`, so the active-team selection is now
also mirrored to a cookie:

```js
document.cookie = `active_team_id=${activeTeam.id}; path=/; max-age=31536000; samesite=lax`;
```

The layout reads `active_team_id` from the cookie to fetch the *correct*
team's links (falling back to the first team). The cookie is cleared on
logout. localStorage is still written for backwards compatibility and the
client-only SWR fallbacks.

## Net effect

- **Repeat / in-app navigation:** instant paint from localStorage caches +
  prefetched route bundles.
- **Cold load / hard refresh:** real teams + links arrive in the initial
  server-rendered HTML instead of after 4 client round-trips.

## Hydration mismatch fix

Once links became server-rendered, the dashboard hit a React hydration
error: the server HTML and the first client render produced different text.
Two classes of bug surfaced and were fixed by making the **initial** render
deterministic (identical on server + client), then upgrading post-mount:

1. **`dashboard-links.tsx` (`LinkRow`)** — displayed the short URL via a
   `typeof window` branch (`buildShortUrl` on client, bare slug on server),
   and `getDisplayOrigin()` returns `https://tappr.me` on the server but the
   real `window.location` origin on the client. Fixed by seeding state with
   the SSR-safe `https://tappr.me/<slug>` and upgrading to the real origin in
   a `useEffect` (no visible flash in production, where they're equal).

2. **`useClickStats` + `useCollections`** — both read `localStorage` inside
   their `useState` initializers, so the server rendered empty/skeleton while
   the client rendered cached data. Fixed by initializing to deterministic
   defaults and applying the cached snapshot in a `useEffect` after mount.

The providers (`User`/`Team`/`Links`) avoid the same trap by treating the
server `initialData` as authoritative on the seeded path and **not** reading
`localStorage` in their initializers when seeded (see the `seeded` guard in
`team-provider.tsx`).

## Wider SWR rollout (audit pass)

A follow-up audit of every dashboard section found the same "fetch-on-mount
with a skeleton, no cache" pattern in many hooks/pages. A shared helper was
added — `src/lib/swr-cache.ts` (`readSwrCache` / `writeSwrCache`) — and the
SWR pattern applied to:

| Area | File | Cache key |
| --- | --- | --- |
| Alerts list | `app/(dashboard)/dashboard/alerts/page.tsx` | `tappr_alerts_cache_<teamId>` |
| Alert metrics (heavy `/api/alerts/metrics`) | `components/alerts/metrics-dashboard.tsx` | `tappr_alert_metrics_cache_<teamId>` |
| Analytics (raw-clicks aggregation) | `hooks/use-analytics.ts` | `tappr_analytics_cache_<teamId>_<range>_<collection>_<link>_<from>_<to>` |
| Notification bell (every page) | `hooks/use-anomaly-alerts.ts` | `tappr_anomaly_alerts_cache_<teamId>` |
| Billing / subscriptions | `app/(dashboard)/dashboard/billing/page.tsx` | `tappr_subscriptions_cache_<teamId>` |
| API keys (developer) | `hooks/use-api-keys.ts` | `tappr_api_keys_cache_<teamId>` |
| Team settings | `hooks/use-settings.ts` | `tappr_settings_cache_<teamId>` |
| Team members | `hooks/use-team-members.ts` | `tappr_team_members_cache_<teamId>` |
| Business brain | `hooks/use-business-brain.ts` | `tappr_brain_cache_<teamId>` |

Each one: deterministic empty/loading `useState` init (no hydration
mismatch), hydrate from cache in a `useEffect` after mount, write cache after
fetch, and skip the skeleton when a cache exists. Analytics caches the
aggregated result (small) keyed per filter combination, not the raw clicks.

## Analytics aggregation moved server-side (RPC)

**Done.** `use-analytics.ts` no longer pulls every raw `link_clicks` row to
aggregate in JS — it calls a new Postgres RPC `dashboard_analytics`
(migration `supabase/migrations/020_dashboard_analytics_rpc.sql`). The RPC
does all the grouping server-side and returns ~30 rows of JSON
(`total_clicks`, `daily`, `geo`, `device`, `referrers`, `top_links`,
`browsers`, `hourly`) instead of thousands of raw rows. This fixes the
**first** load too, not just repeat views (which the SWR cache already
covered). It also speeds the AI Brain page, which builds its context from
`useAnalytics("30d")`.

Details:
- Same `is_team_member` security guard / `SECURITY DEFINER` / `search_path`
  convention as `dashboard_click_stats`.
- tz-aware daily + hourly bucketing (`AT TIME ZONE p_tz`) matches the old JS
  (`dateKeyInTimezone` / `getHourInTimezone`). Browser/referrer parsing
  mirrors the JS chains exactly.
- The link set (all / by collection / single link) is resolved server-side
  from params, honoring the same precedence (link wins over collection).
- The client still fills daily gaps + the 0–23 hour series in JS (those
  depend on the range semantics), sourcing counts from the RPC result.

## Server-side follow-ups — DONE

All three remaining audit items are now fixed (migration
`supabase/migrations/021_collection_counts_and_api_stats.sql`):

- **`/api/v1/stats`** → calls the new `api_team_stats(p_team_id, p_days,
  p_link_id)` RPC: one server-side GROUP BY for daily/countries/devices/
  referrers + the all-time total, instead of pulling every raw click row and
  aggregating in JS plus a separate count query. Response shape unchanged
  (daily UTC dates, referrer keeps full hostname). The route keeps a cheap
  `links(id)` fetch only for the empty + 404 checks.
- **`use-collections.ts`** → no longer uses `link_count:links(count)` (a
  correlated subquery per collection). Now fetches collection rows + the new
  `team_collection_link_counts(p_team_id)` RPC (single GROUP BY) in parallel
  and maps counts client-side — same pattern as `LinksProvider`.
- **`/api/alerts/metrics`** → module-level 60s cache keyed per team. Auth +
  membership are still verified on every request before the cached result is
  served; only the heavy `computeAlertMetrics` aggregation is skipped within
  the TTL.

Both RPCs follow the existing convention (`STABLE SECURITY DEFINER`,
`search_path = public`) and were verified against live data.

## Notes / follow-ups

- Verified with `tsc --noEmit` (clean) and `npm run build` (passes,
  "Compiled successfully").
