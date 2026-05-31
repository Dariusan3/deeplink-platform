import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { logAuditEvent } from "@/lib/audit";

// POST /api/admin/grant-plan
//
// Admin-only endpoint to drop a "free" subscription on a team — used for
// VIPs, support comps, beta testers, etc.
//
// Behaviour:
//   - Validates the caller is an admin (defence in depth on top of RLS).
//   - Cancels any currently active subscription for the team so the new
//     granted one is the single source of truth. Existing trial rows
//     waiting on a FanBasis payment are left alone (they'll resolve via
//     the webhook normally).
//   - Inserts a new subscriptions row with is_free=true and granted_by
//     pointing to the admin user.
//   - The `sync_team_plan` trigger pushes the new plan to teams.plan.
//   - Audit-logs admin.granted_plan with full context.

const VALID_PLANS = ["free", "starter", "growth", "agency"] as const;
type GrantedPlan = (typeof VALID_PLANS)[number];

export async function POST(request: NextRequest) {
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

  // Defence in depth — RLS would also block but we 403 cleanly here.
  const { data: profile } = await admin
    .from("users")
    .select("is_admin, full_name, email")
    .eq("id", authData.user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { team_id, plan, duration_days, notes } = body as {
    team_id?: string;
    plan?: GrantedPlan;
    duration_days?: number | null;
    notes?: string;
  };

  if (!team_id || !plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { error: "team_id and a valid plan (free|starter|growth|agency) are required" },
      { status: 400 }
    );
  }

  const { data: team } = await admin
    .from("teams")
    .select("id, name, plan")
    .eq("id", team_id)
    .single();
  if (!team) {
    return NextResponse.json({ error: "team not found" }, { status: 404 });
  }

  // Compute expiry. duration_days = null/undefined = open-ended (no
  // expires_at), useful for "lifetime VIP" grants.
  const expiresAt =
    duration_days && duration_days > 0
      ? new Date(Date.now() + duration_days * 86_400_000).toISOString()
      : null;

  // Cancel any currently-active row so the new granted one is unambiguous.
  // Trial rows (awaiting FanBasis payment) are left alone — if they
  // succeed later, the webhook handler will activate them and overwrite
  // teams.plan again. Admin should not grant plans on top of pending
  // billing, but if they do, the most-recent active row wins.
  await admin
    .from("subscriptions")
    .update({ status: "cancelled", notes: "Cancelled by admin grant" })
    .eq("team_id", team_id)
    .eq("status", "active");

  const { data: inserted, error: insertErr } = await admin
    .from("subscriptions")
    .insert({
      team_id,
      plan,
      status: "active",
      is_free: true,
      granted_by: authData.user.id,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      notes: notes?.trim() || `Granted by admin (${profile.email})`,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // The sync_team_plan trigger fires AFTER INSERT and bumps teams.plan
  // for us — no manual UPDATE needed here.

  await logAuditEvent(admin, {
    eventType: "admin.granted_plan",
    severity: "info",
    description: `Granted ${plan} to "${team.name}"${expiresAt ? ` for ${duration_days} days` : " (open-ended)"}`,
    actorUserId: authData.user.id,
    actorEmail: profile.email,
    teamId: team_id,
    source: "api:/admin/grant-plan",
    metadata: {
      previous_plan: team.plan,
      new_plan: plan,
      duration_days: duration_days ?? null,
      expires_at: expiresAt,
      subscription_id: inserted.id,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ subscription: inserted });
}
