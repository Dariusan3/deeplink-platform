import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runAllDetectors, persistDetections, mergeRuns, type DetectorRun } from "@/lib/alert-detectors";
import { EMAIL_TYPES, type AlertType } from "@/lib/alerts";
import { hasFeature } from "@/lib/entitlements";
import { sendAlertDigestEmail } from "@/lib/email";

// Only the types on the explicit allowlist are worth an email; see
// EMAIL_TYPES in src/lib/alerts.ts for why it is a list and not a rule.
const EMAIL_WORTHY = (a: { alert_type: string }) =>
  EMAIL_TYPES.has(a.alert_type as AlertType);
const MAX_ALERTS_PER_DIGEST = 8;

// Vercel cron: scans every team on a 3-hour cadence and inserts alerts +
// re-verifies acked ones. Manual user-initiated checks go through
// /api/alerts/check (no rate limit, scoped to active team).

// Lazily created on first request, not at module scope: `next build` loads
// this module to collect page data and an eager top-level client throws
// "supabaseKey is required" since the service key isn't set at build time.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must BLOCK, never wave the request through —
  // otherwise an unset CRON_SECRET in prod leaves this endpoint fully public.
  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data: teams } = await supabase.from("teams").select("id, plan, name");
  if (!teams || teams.length === 0) {
    return NextResponse.json({ teams: 0, alerts: 0 });
  }

  const runs: DetectorRun[] = [];
  for (const team of teams) {
    runs.push(await runAllDetectors(supabase, team));
  }
  const all = mergeRuns(runs);
  const { inserted, closed, insertedAlerts } = await persistDetections(
    supabase,
    teams.map((t) => t.id),
    all
  );

  // ── Email digests ────────────────────────────────────────────────────
  // One email per team, only for FRESHLY inserted email-worthy alerts. Because
  // persistDetections refuses to re-insert an alert that's still open or inside
  // its cooldown, a lingering condition never re-emails — killing "primesc mereu".
  let emailed = 0;
  const byTeam = new Map<string, typeof insertedAlerts>();
  for (const a of insertedAlerts) {
    if (!EMAIL_WORTHY(a)) continue;
    const list = byTeam.get(a.team_id) ?? [];
    list.push(a);
    byTeam.set(a.team_id, list);
  }

  for (const [teamId, alerts] of byTeam) {
    const team = teams.find((t) => t.id === teamId);
    // Email alerts are a paid feature (Starter and above).
    if (!team || !hasFeature(team.plan, "emailAlerts")) continue;

    // Highest severity first so the digest subject leads with the worst.
    const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
    alerts.sort((x, y) => (order[x.severity] ?? 3) - (order[y.severity] ?? 3));

    const { data: owners } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("role", "owner");

    for (const owner of owners ?? []) {
      const { data: u } = await supabase
        .from("users")
        .select("email")
        .eq("id", owner.user_id)
        .single();
      if (!u?.email) continue;
      await sendAlertDigestEmail({
        to: u.email,
        teamName: team.name ?? "your team",
        alerts: alerts.slice(0, MAX_ALERTS_PER_DIGEST).map((a) => ({
          severity: a.severity,
          title: a.title,
          description: a.description,
          affectedLink: a.affected_link,
        })),
      });
      emailed++;
    }
  }

  return NextResponse.json({
    teams: teams.length,
    detected: all.alerts.length,
    inserted,
    closed,
    emailed,
  });
}
