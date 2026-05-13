import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { runAllDetectors, persistDetections } from "@/lib/alert-detectors";

// User-initiated "Check now" — runs the same detectors as the cron but
// scoped to the active team. Anyone in the team can trigger it. We use
// service role server-side to bypass RLS on the writes.

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { team_id } = await request.json().catch(() => ({} as { team_id?: string }));
  if (!team_id) {
    return NextResponse.json({ error: "team_id required" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Confirm the caller is a member of this team.
  const { data: membership } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", team_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not a team member" }, { status: 403 });
  }

  const { data: team } = await admin
    .from("teams")
    .select("id, plan")
    .eq("id", team_id)
    .single();
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const detected = await runAllDetectors(admin, team);
  const inserted = await persistDetections(admin, [team_id], detected);

  return NextResponse.json({ detected: detected.length, inserted });
}
