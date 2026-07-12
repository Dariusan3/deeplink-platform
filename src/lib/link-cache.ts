import { unstable_cache, revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side cache for the slug resolver in src/app/[slug]/route.ts — the
// product's hot path. Every short-link click used to pay for three Supabase
// queries before it could redirect. This caches that lookup.
//
// Design note — why a TTL *and* tag invalidation, not just one:
//
//   Tags give instant invalidation on the paths we know about (pause a link,
//   change a destination). But links are written from several places, some of
//   them client components talking to Supabase directly from the browser
//   (providers/links-provider.tsx, hooks/use-ab-tests.ts, hooks/use-collections.ts),
//   which cannot call revalidateTag — it is server-only. Those go through
//   POST /api/cache/revalidate instead, and that call can fail.
//
//   So the 60s TTL is the safety net, deliberately. If an invalidation is ever
//   missed — a call site we didn't wire up, a failed request, a write path
//   added later — the worst case is a stale redirect for up to 60 seconds, not
//   forever. That bound is the whole reason this is safe to put on the money
//   path.
//
// What is NOT cached, on purpose:
//   - click tracking (link_clicks / ab_test_events inserts) — always written
//   - the rotator's random pick and the A/B 50/50 split — decided per request
//   - team_settings — only read on the paused-link and TikTok branches, which
//     are rare, so caching it would buy nothing and add invalidation surface
const SLUG_TTL_SECONDS = 60;

export const slugTag = (slug: string) => `slug:${slug}`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function anonClient(): SupabaseClient | null {
  if (!supabaseUrl || supabaseUrl.includes("your-supabase-url-here")) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export type RotatorLink = { id: string; destination_url: string; slug: string };

export type SlugResolution = {
  rotator: { collectionId: string; links: RotatorLink[] } | null;
  abTest: Record<string, unknown> | null;
  link: {
    id: string;
    destination_url: string;
    redirect_rules: unknown;
    is_active: boolean;
    team_id: string | null;
  } | null;
};

// The uncached lookup. Resolves a slug across its three namespaces in
// parallel. Match priority (rotator > A/B test > plain link) is applied by the
// caller, exactly as before.
async function lookupSlug(slug: string): Promise<SlugResolution> {
  const supabase = anonClient();
  if (!supabase) return { rotator: null, abTest: null, link: null };

  const [rotatorRes, abRes, linkRes] = await Promise.all([
    supabase
      .from("collections")
      .select("id")
      .eq("rotator_slug", slug)
      .eq("is_rotator", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ab_tests")
      .select("*")
      .eq("slug", slug)
      .in("status", ["running", "completed"])
      .limit(1)
      .maybeSingle(),
    supabase
      .from("links")
      .select("id, destination_url, redirect_rules, is_active, team_id")
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  // A rotator needs its member links too. Fetched here (inside the cached
  // unit) so a rotator click doesn't pay for a second round-trip on every hit.
  let rotator: SlugResolution["rotator"] = null;
  if (rotatorRes.data) {
    const { data: rotatorLinks } = await supabase
      .from("links")
      .select("id, destination_url, slug")
      .eq("collection_id", rotatorRes.data.id)
      .eq("is_active", true);
    rotator = {
      collectionId: rotatorRes.data.id,
      links: (rotatorLinks ?? []) as RotatorLink[],
    };
  }

  return {
    rotator,
    abTest: (abRes.data as Record<string, unknown> | null) ?? null,
    link: (linkRes.data as SlugResolution["link"]) ?? null,
  };
}

// Cached entry point used by the resolver route.
export function resolveSlug(slug: string): Promise<SlugResolution> {
  return unstable_cache(
    () => lookupSlug(slug),
    ["slug-resolution", slug],
    { tags: [slugTag(slug)], revalidate: SLUG_TTL_SECONDS }
  )();
}

// Drop the cached resolution for one or more slugs. Server-only.
//
// `{ expire: 0 }` is the second arg Next 16 requires on revalidateTag: it caps
// how stale an entry may be served while it revalidates. Zero means purge now,
// serve nothing stale. That is the point here — when someone pauses a link or
// repoints it, the very next click must see the new state, not a stale-while-
// revalidate hand-me-down.
export async function invalidateSlugs(slugs: (string | null | undefined)[]) {
  for (const slug of slugs) {
    if (slug) revalidateTag(slugTag(slug), { expire: 0 });
  }
}

// Invalidate everything a change to one link can affect.
//
// The link's own slug is the obvious one. The subtle one: if the link belongs
// to a rotator collection, that rotator is cached under its *own* slug
// (collections.rotator_slug) and its member list just changed — pausing a link
// inside a rotator must stop the rotator handing it out. Different cache key,
// so it needs its own invalidation.
export async function invalidateLink(
  supabase: SupabaseClient,
  link: { slug?: string | null; collection_id?: string | null }
) {
  const slugs: (string | null | undefined)[] = [link.slug];

  if (link.collection_id) {
    const { data } = await supabase
      .from("collections")
      .select("rotator_slug")
      .eq("id", link.collection_id)
      .eq("is_rotator", true)
      .maybeSingle();
    if (data?.rotator_slug) slugs.push(data.rotator_slug as string);
  }

  await invalidateSlugs(slugs);
}

// Purge every rotator slug belonging to a team.
//
// For bulk operations ("pause all my links", "move these 40 links"), working
// out exactly which rotators changed would mean snapshotting the pre-update
// state of every row the filter touches. Not worth it: bulk ops are rare and
// human-initiated, and a team has a handful of rotators at most. Purging all of
// them costs a few extra cache misses and is obviously correct, which beats a
// clever diff that silently misses a case.
export async function invalidateTeamRotators(
  supabase: SupabaseClient,
  teamId: string
) {
  const { data } = await supabase
    .from("collections")
    .select("rotator_slug")
    .eq("team_id", teamId)
    .eq("is_rotator", true);

  await invalidateSlugs((data ?? []).map((c) => c.rotator_slug as string | null));
}
