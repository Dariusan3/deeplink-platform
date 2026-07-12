import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { invalidateSlugs } from "@/lib/link-cache";

// Bridge for client-side writers.
//
// The dashboard mutates links, A/B tests and collections straight from the
// browser (providers/links-provider.tsx, hooks/use-ab-tests.ts,
// hooks/use-collections.ts). Those writes need to drop the slug resolver's
// server cache, but revalidateTag() is server-only — the browser can't call
// it. So they POST here instead.
//
// Auth: caller must be signed in. That's the bar on purpose — the only thing
// this endpoint can do is *discard* a cache entry, so the worst an authed user
// can do with someone else's slug is force one extra DB read on the next click.
// No data is returned and nothing is mutated, so a per-slug ownership check
// would cost a query on every write to defend against nothing.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { slugs?: unknown; collectionIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isStringArray = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((s) => typeof s === "string");

  const slugs = body.slugs === undefined ? [] : body.slugs;
  const collectionIds = body.collectionIds === undefined ? [] : body.collectionIds;

  if (!isStringArray(slugs) || !isStringArray(collectionIds)) {
    return NextResponse.json(
      { error: "Body must be { slugs?: string[], collectionIds?: string[] }" },
      { status: 400 }
    );
  }

  const toInvalidate: string[] = [...slugs];

  // A link that lives in a rotator collection is also reachable through the
  // collection's own rotator_slug, which is a separate cache entry with its own
  // key. The browser doesn't know that slug — it only has the collection id —
  // so resolve it here. Without this, pausing a link inside a rotator would
  // clear the link's cache but leave the rotator still handing it out.
  if (collectionIds.length > 0) {
    const { data } = await supabase
      .from("collections")
      .select("rotator_slug")
      .in("id", collectionIds)
      .eq("is_rotator", true);

    for (const row of data ?? []) {
      if (row.rotator_slug) toInvalidate.push(row.rotator_slug as string);
    }
  }

  await invalidateSlugs(toInvalidate);

  return NextResponse.json({ revalidated: toInvalidate.length });
}
