import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { computeAlertMetrics } from "@/lib/alert-metrics";

// GET /api/alerts/metrics?team_id=…
// Returns the live numbers that drive every detector — the alerts page
// renders them at the top so the user understands "why" alerts fire (or
// don't) without waiting for a cron run.
//
// Caller must be a member of the team. Uses service-role server-side to
// bypass RLS on the multi-table reads.

export async function GET(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const teamId = new URL(request.url).searchParams.get("team_id");
  if (!teamId) {
    return NextResponse.json({ error: "team_id required" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: membership } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not a team member" }, { status: 403 });
  }

  const { data: team } = await admin
    .from("teams")
    .select("id, plan")
    .eq("id", teamId)
    .single();
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const metrics = await computeAlertMetrics(admin, team);
  return NextResponse.json(metrics);
}
