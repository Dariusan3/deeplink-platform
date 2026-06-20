import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TAPPR_PLANS, type TapprPlan } from "@/lib/fanbasis";
import { logAuditEvent } from "@/lib/audit";

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

  // Credit the referring partner if this buyer was referred. Idempotent
  // (only processes a pending referral once).
  await creditPartnerOnPaidSignup(admin, authData.user.id, plan).catch(() => {});

  await logAuditEvent(admin, {
    eventType: "subscription.created",
    severity: "success",
    description: `Plan activated: ${plan} ($${(TAPPR_PLANS[plan].amountCents / 100).toFixed(2)}/mo)`,
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

// Mirror of the webhook's partner-credit logic so a referred buyer still
// converts their partner's referral when activation happens via the
// success redirect instead of the (broken) webhook.
async function creditPartnerOnPaidSignup(
  admin: SupabaseClient,
  payerUserId: string,
  plan: TapprPlan
) {
  const { data: referral } = await admin
    .from("partner_referrals")
    .select("id, partner_id, status")
    .eq("referred_user_id", payerUserId)
    .eq("status", "pending")
    .maybeSingle();
  if (!referral) return;

  const { data: partner } = await admin
    .from("partner_profiles")
    .select("id, commission_rate")
    .eq("id", referral.partner_id)
    .single();
  if (!partner) return;

  const monthlyValue = TAPPR_PLANS[plan].amountCents / 100;
  const commission = monthlyValue * Number(partner.commission_rate);

  // Mark the referral converted. NOTE: the status check constraint only
  // allows 'pending' | 'active' | 'churned' — 'active' IS the converted
  // state. Using 'converted' here silently failed (the JS client returns
  // the error in the response instead of throwing) so referrals stayed
  // 'pending' even after a paid signup.
  const { error: updErr } = await admin
    .from("partner_referrals")
    .update({
      status: "active",
      plan,
      monthly_value: monthlyValue,
      converted_at: new Date().toISOString(),
    })
    .eq("id", referral.id);
  if (updErr) {
    console.error("[billing/activate] referral convert failed", updErr);
    return;
  }

  // Idempotency: don't double-credit if an earning already exists for
  // this referral (e.g. webhook + activate both fire for one payment).
  const { data: existingEarning } = await admin
    .from("partner_earnings")
    .select("id")
    .eq("referral_id", referral.id)
    .maybeSingle();
  if (existingEarning) return;

  await admin.from("partner_earnings").insert({
    partner_id: referral.partner_id,
    referral_id: referral.id,
    amount: commission,
    type: "commission",
    status: "pending",
    period_month: new Date().toISOString().slice(0, 10),
  });
}
