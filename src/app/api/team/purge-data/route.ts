import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Wipes a team's content but keeps the team itself + members + settings:
//   - links              (cascades to link_clicks, ab_test_events via FK)
//   - collections
//   - ab_tests           (cascades to ab_test_events)
//   - brain_chats        (preserves business_brain knowledge)
// Caller must be a team OWNER and pass back the exact team name to confirm.

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { team_id, confirm_name } = await request.json().catch(() => ({}));
  if (!team_id || !confirm_name) {
    return NextResponse.json(
      { error: "team_id and confirm_name are required" },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // 1. Verify caller is OWNER of this team.
  const { data: membership } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", team_id)
    .eq("user_id", authData.user.id)
    .single();
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  // 2. Type-to-confirm — exact name match (case-insensitive trim).
  const { data: team } = await admin
    .from("teams")
    .select("name")
    .eq("id", team_id)
    .single();
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });
  if (team.name.trim().toLowerCase() !== String(confirm_name).trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Team name doesn't match. Type the team name exactly." },
      { status: 400 }
    );
  }

  // 3. Delete in dependency order. FKs use ON DELETE CASCADE for clicks
  // and ab_test_events, so we only need to remove parents.
  const errors: string[] = [];
  const tables = ["ab_tests", "brain_chats", "collections", "links"] as const;
  for (const t of tables) {
    const { error } = await admin.from(t).delete().eq("team_id", team_id);
    if (error) errors.push(`${t}: ${error.message}`);
  }

  if (errors.length) {
    return NextResponse.json(
      { error: `Partial purge — ${errors.join("; ")}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
