import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { NextRequest } from "next/server";

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

  let body: { destination_url?: string; slug?: string; title?: string };
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

  // Validate URL
  let destHost: string;
  try {
    destHost = new URL(body.destination_url).hostname;
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

  const slug =
    body.slug || Math.random().toString(36).substring(2, 8);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("links")
    .insert({
      destination_url: body.destination_url,
      slug,
      title: body.title || null,
      team_id: auth.teamId,
      created_by: auth.userId,
    })
    .select("id, slug, destination_url, title, is_active, created_at")
    .single();

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
