import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { normalizeDestinationUrl } from "@/lib/url-normalize";
import { parseRedirectRules } from "@/lib/redirect-rules";
import { invalidateSlugs } from "@/lib/link-cache";
import { NextRequest } from "next/server";
import type { RedirectRule } from "@/types/links";
import type { Json } from "@/types/database";

// GET /api/v1/links — List all links for the team
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("links")
    .select("id, slug, destination_url, title, is_active, collection_id, created_at, updated_at", { count: "exact" })
    .eq("team_id", auth.teamId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}

// POST /api/v1/links — Create a new link
export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  let body: {
    destination_url?: string;
    slug?: string;
    title?: string;
    redirect_rules?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.destination_url) {
    return Response.json(
      { error: "destination_url is required" },
      { status: 400 }
    );
  }

  // Normalize first (auto-add https, strip www) so a payload like
  // `example.com` or `http://www.example.com` is canonicalized.
  const destination_url = normalizeDestinationUrl(body.destination_url);

  // Validate URL
  let destHost: string;
  try {
    destHost = new URL(destination_url).hostname;
  } catch {
    return Response.json(
      { error: "destination_url must be a valid URL" },
      { status: 400 }
    );
  }

  if (destHost === request.nextUrl.hostname) {
    return Response.json(
      { error: "destination_url cannot point to this platform" },
      { status: 400 }
    );
  }

  // Smart-routing rules are optional. Previously this endpoint silently
  // dropped them: the field was not read, so a request carrying rules returned
  // 201 and created a link with none.
  const supabase = await createClient();

  let redirectRules: RedirectRule[] | null = null;
  if (body.redirect_rules !== undefined && body.redirect_rules !== null) {
    // Gate routing condition types by the team's plan.
    const { data: team } = await supabase
      .from("teams")
      .select("plan")
      .eq("id", auth.teamId)
      .single();
    const parsed = parseRedirectRules(body.redirect_rules, request.nextUrl.hostname, team?.plan ?? "free");
    if ("error" in parsed) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }
    redirectRules = parsed.rules;
  }

  const slug =
    body.slug || Math.random().toString(36).substring(2, 8);

  const { data, error } = await supabase
    .from("links")
    .insert({
      destination_url,
      slug,
      title: body.title || null,
      redirect_rules: redirectRules as unknown as Json,
      team_id: auth.teamId,
      created_by: auth.userId,
    })
    .select("id, slug, destination_url, title, redirect_rules, is_active, created_at")
    .single();

  if (!error) {
    // Clear any cached "no such slug" resolution left behind by a probe of
    // this slug before the link existed. See lib/link-cache.ts.
    await invalidateSlugs([data.slug]);
  }

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "A link with this slug already exists" },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
