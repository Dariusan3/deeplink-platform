import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { computeAlertMetrics } from "@/lib/alert-metrics";

// computeAlertMetrics aggregates across several tables on every call, and the
// alerts page hits this on each mount. Cache the result per team for a short
// window so rapid revisits / re-renders don't recompute. The module-level Map
// persists for the lifetime of the serverless instance (best-effort). Auth +
// membership are still verified on every request before the cache is served.
const METRICS_TTL_MS = 60_000;
const metricsCache = new Map<string, { at: number; data: unknown }>();

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

  // Serve a fresh-enough cached result (member already verified above).
  const cached = metricsCache.get(teamId);
  if (cached && Date.now() - cached.at < METRICS_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const { data: team } = await admin
    .from("teams")
    .select("id, plan")
    .eq("id", teamId)
    .single();
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });

  const metrics = await computeAlertMetrics(admin, team);
  metricsCache.set(teamId, { at: Date.now(), data: metrics });
  return NextResponse.json(metrics);
}
