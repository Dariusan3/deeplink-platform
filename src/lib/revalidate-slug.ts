// Client-side helper: tell the server to drop the slug resolver's cache after
// a write made directly from the browser.
//
// Fire-and-forget by design. The dashboard write has already succeeded by the
// time this runs, and the resolver cache carries a 60s TTL (see lib/link-cache.ts),
// so a failed revalidation costs at most 60s of a stale redirect — it must never
// fail the user's action or block the UI. We log rather than throw.
export function revalidateSlugCache(input: {
  slugs?: (string | null | undefined)[];
  collectionIds?: (string | null | undefined)[];
  /** Purge every slug this team owns — for team-level settings the resolver caches (timezone). */
  teamId?: string | null;
}) {
  const slugs = (input.slugs ?? []).filter((s): s is string => !!s);
  const collectionIds = (input.collectionIds ?? []).filter((s): s is string => !!s);
  const teamId = input.teamId || undefined;

  if (slugs.length === 0 && collectionIds.length === 0 && !teamId) return;

  void fetch("/api/cache/revalidate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slugs, collectionIds, teamId }),
  }).catch((err) => {
    console.error("Slug cache revalidation failed (will self-heal via TTL):", err);
  });
}
