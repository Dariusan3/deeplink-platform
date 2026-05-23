import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/activity
// Returns rows from `audit_log` with optional filters. Admin-only — the
// RLS policy on audit_log enforces this even if someone bypasses the
// auth check below.
//
// Query params:
//   prefix     — event_type prefix filter (e.g. "payment", "subscription")
//   severity   — info|success|warning|error
//   q          — substring search over description, actor_email, target_email
//   from / to  — ISO date range on created_at
//   limit      — page size (default 100, max 500)
//   cursor     — created_at ISO to paginate before (for older rows)

export async function GET(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Service-role check — RLS would also block but we 403 cleanly here.
  const { data: profile } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", authData.user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") || "";
  const severity = url.searchParams.get("severity") || "";
  const q = url.searchParams.get("q") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const cursor = url.searchParams.get("cursor") || "";
  const rawLimit = Number(url.searchParams.get("limit") || "100");
  const limit = Math.min(Math.max(rawLimit, 1), 500);

  let query = admin
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (prefix) query = query.like("event_type", `${prefix}%`);
  if (severity) query = query.eq("severity", severity);
  if (from) query = query.gte("created_at", from);
  if (to) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }
  if (cursor) query = query.lt("created_at", cursor);

  if (q.trim()) {
    // Postgres OR — search across the 3 display fields. Wrap in % so it's
    // a contains match. ilike for case-insensitivity.
    const term = `%${q.trim()}%`;
    query = query.or(
      `description.ilike.${term},actor_email.ilike.${term},target_email.ilike.${term}`
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}
