# Link Favorites in Sidebar

Parallel feature to "Starred Collections": a link can be marked as favorite and shows up in the sidebar under a **Favorites** section.

## DB
[supabase/migrations/014_link_favorite.sql](../supabase/migrations/014_link_favorite.sql)
- Adds `is_favorite BOOLEAN NOT NULL DEFAULT false` on `public.links`.
- Partial index `idx_links_favorite ON public.links(team_id) WHERE is_favorite = true` keeps the sidebar query cheap — only favorites are indexed, not the whole table.

## Data layer
- [src/types/database.ts](../src/types/database.ts) — `is_favorite` added to Row/Insert/Update.
- [src/hooks/use-links.ts](../src/hooks/use-links.ts) — new `toggleFavorite(id, favorite)` helper with optimistic update; reverts on DB error.

## UI
- [src/components/links/link-card.tsx](../src/components/links/link-card.tsx) — star button next to the Live/Paused badge in the card header. Filled amber when favorite, outlined otherwise. Wired via new `onToggleFavorite` prop.
- [src/components/links/link-list.tsx](../src/components/links/link-list.tsx) — passes `toggleFavorite` from the hook down to each card.
- [src/components/sidebar.tsx](../src/components/sidebar.tsx) — reads `links` from `useLinks`, filters `is_favorite === true`, and renders a Favorites section above Starred Collections. Hidden when the sidebar is collapsed and when the user has no favorites. Each item links to `/dashboard/analytics?linkId=${link.id}` — matches the existing "Analytics" dropdown action on the card.

## Scoping
RLS on `public.links` already restricts reads by team, and `useLinks` fetches with `.eq("team_id", activeTeam.id)`. Favorites are inherently per-team — when you switch teams, the sidebar re-populates with the new team's favorites automatically via the realtime subscription that already exists in the hook.
