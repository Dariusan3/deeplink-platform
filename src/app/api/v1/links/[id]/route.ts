import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { NextRequest } from "next/server";

// GET /api/v1/links/:id — Get a single link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("links")
    .select("id, slug, destination_url, title, is_active, collection_id, redirect_rules, created_at, updated_at")
    .eq("id", id)
    .eq("team_id", auth.teamId)
    .single();

  if (error || !data) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  return Response.json({ data });
}

// PATCH /api/v1/links/:id — Update a link
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  let body: { destination_url?: string; slug?: string; title?: string; is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.destination_url) {
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
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("links")
    .update({
      ...(body.destination_url !== undefined && { destination_url: body.destination_url }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.is_active !== undefined && { is_active: body.is_active }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("team_id", auth.teamId)
    .select("id, slug, destination_url, title, is_active, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "A link with this slug already exists" },
        { status: 409 }
      );
    }
    if (error.code === "PGRST116") {
      return Response.json({ error: "Link not found" }, { status: 404 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}

// DELETE /api/v1/links/:id — Delete a link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const supabase = await createClient();

  // Verify the link belongs to the team
  const { data: existing } = await supabase
    .from("links")
    .select("id")
    .eq("id", id)
    .eq("team_id", auth.teamId)
    .single();

  if (!existing) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("links")
    .delete()
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: "Link deleted" });
}
