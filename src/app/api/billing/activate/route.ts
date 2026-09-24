import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { TAPPR_PLANS, type TapprPlan } from "@/lib/fanbasis";
import { invalidateOwnerQuota } from "@/lib/click-quota";
import { logAuditEvent } from "@/lib/audit";
import { creditPartnerForPayment } from "@/lib/partner-credit";

// POST /api/billing/activate { team_id, plan }
//
// Primary activation path. FanBasis webhooks have been arriving with
// EMPTY payloads (no buyer email, no amount, no checkout_session_id, no
// api_metadata) — so the webhook can't map a payment back to a team.
// Instead we activate from the FanBasis success-redirect, which lands on
// /billing/success?team_id=...&plan=... — query params WE set when
// creating the checkout session, so they're trustworthy.
//
// Security: the caller must be authenticated AND own the team AND have a
// recent `trial` subscription row for that team+plan (proof they really
// started a checkout via /api/billing/checkout). That stops someone from
// hitting this URL to self-grant a plan they never paid for.

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { team_id, plan } = body as { team_id?: string; plan?: TapprPlan };
  if (!team_id || !plan || !TAPPR_PLANS[plan]) {
    return NextResponse.json({ error: "team_id and a valid plan are required" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Caller must own the team.
  const { data: membership } = await admin
    .from("team_members")
    .select("role")
    .eq("team_id", team_id)
    .eq("user_id", authData.user.id)
    .single();
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "owner only" }, { status: 403 });
  }

  // Find the most recent trial row for this team+plan — that's the
  // checkout the user just completed. If none exists, they didn't go
  // through our checkout flow; refuse.
  const { data: trial } = await admin
    .from("subscriptions")
    .select("id")
    .eq("team_id", team_id)
    .eq("plan", plan)
    .eq("status", "trial")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!trial) {
    // Idempotency: maybe the webhook already activated it, or the user
    // refreshed the success page. If there's already an active row for
    // this exact team+plan, treat as success.
    const { data: alreadyActive } = await admin
      .from("subscriptions")
      .select("id")
      .eq("team_id", team_id)
      .eq("plan", plan)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (alreadyActive) {
      return NextResponse.json({ ok: true, alreadyActive: true });
    }
    return NextResponse.json(
      { error: "no pending checkout found for this plan" },
      { status: 404 }
    );
  }

  const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();

  // Activate this row, cancel any OTHER active subs for the team so a
  // plan change doesn't leave two active rows fighting the sync trigger.
  await admin
    .from("subscriptions")
    .update({ status: "cancelled", notes: "Superseded by plan change" })
    .eq("team_id", team_id)
    .eq("status", "active")
    .neq("id", trial.id);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      expires_at: expiresAt,
      notes: "Activated via success redirect",
    })
    .eq("id", trial.id);

  // Belt-and-suspenders: the sync_team_plan trigger should bump
  // teams.plan on the UPDATE above, but set it explicitly too in case
  // the trigger is scoped narrowly.
  await admin.from("teams").update({ plan }).eq("id", team_id);

  // The redirect path caches an "is this team over its click cap" verdict per
  // team. They just paid to raise that cap — drop the verdict now rather than
  // leaving their links dark for the rest of the TTL. Account-wide, because the
  // plan applies to every team this owner created.
  await invalidateOwnerQuota(admin, team_id).catch(() => {});

  // Credit the referring partner if this buyer was referred. Idempotent
  // (only processes a pending referral once).
  await creditPartnerForPayment(admin, authData.user.id, plan, "api:/billing/activate").catch(() => {});

  await logAuditEvent(admin, {
    eventType: "subscription.created",
    severity: "success",
    description: `Plan activated: ${plan} (€${(TAPPR_PLANS[plan].amountCents / 100).toFixed(2)}/mo)`,
    actorUserId: authData.user.id,
    actorEmail: authData.user.email || null,
    teamId: team_id,
    targetUserId: authData.user.id,
    targetEmail: authData.user.email || null,
    source: "api:/billing/activate",
    metadata: { plan, via: "success_redirect" },
  });

  return NextResponse.json({ ok: true, activated: true, plan });
}
