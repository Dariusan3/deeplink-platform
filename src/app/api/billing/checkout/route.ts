import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  createCheckoutSession,
  TAPPR_PLANS,
  type TapprPlan,
  FanBasisError,
} from "@/lib/fanbasis";
import { logAuditEvent } from "@/lib/audit";

// Creates a FanBasis checkout session for the active team's chosen plan and
// returns the hosted-checkout URL the client should redirect the user to.
// The returned link belongs to FanBasis — buyers complete the payment there
// and are bounced back to /billing/success or /billing/cancel.
//
// Caller must be a team OWNER (only owners can change a team's plan).

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { team_id: bodyTeamId, plan } = body as { team_id?: string; plan?: TapprPlan };

  if (!plan || !TAPPR_PLANS[plan]) {
    return NextResponse.json(
      { error: "a valid plan (starter|growth|agency) is required" },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Resolve team: prefer the body-supplied team_id (when /billing inside
  // the dashboard has the context), otherwise pick the user's owned
  // team. This is what lets /pricing — which sits OUTSIDE the dashboard
  // TeamProvider — still kick off a checkout: the button doesn't need
  // to know which team it's billing for, we figure it out server-side.
  let team_id = bodyTeamId;
  if (!team_id) {
    const { data: owned } = await admin
      .from("team_members")
      .select("team_id")
      .eq("user_id", authData.user.id)
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();
    team_id = owned?.team_id;
    if (!team_id) {
      return NextResponse.json(
        { error: "no owned team — create one first" },
        { status: 400 }
      );
    }
  } else {
    // team_id came from the body — verify the caller actually owns it.
    const { data: membership } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", team_id)
      .eq("user_id", authData.user.id)
      .single();
    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "owner only" }, { status: 403 });
    }
  }

  // Refuse to sell a team the plan it is already on.
  //
  // This has to live here and not only on the button. The button can be stale
  // (the /pricing page is statically prerendered), and nothing stops a direct
  // POST — so without this check a customer could pay a second time for the
  // plan they already have, and we'd happily take the money and open a second
  // subscription against the same team.
  const { data: team } = await admin
    .from("teams")
    .select("plan")
    .eq("id", team_id)
    .maybeSingle();

  if (team?.plan === plan) {
    return NextResponse.json(
      { error: `You're already on the ${plan} plan.`, code: "already_on_plan" },
      { status: 409 }
    );
  }

  const cfg = TAPPR_PLANS[plan];
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  try {
    const session = await createCheckoutSession({
      productTitle: cfg.title,
      amountCents: cfg.amountCents,
      type: "subscription",
      frequencyDays: cfg.frequencyDays,
      successUrl: `${baseUrl}/billing/success?team_id=${team_id}&plan=${plan}`,
      cancelUrl: `${baseUrl}/billing/cancel`,
      customerEmail: authData.user.email || undefined,
      // Echoed back on every webhook event for this checkout — that's how
      // we map the incoming payment to the right Tappr team.
      metadata: {
        team_id,
        plan,
        user_id: authData.user.id,
      },
    });

    // Retire any earlier checkout this team started and never paid for.
    //
    // Every call to this route writes a `trial` row so the webhook can map a
    // payment back to a team. Nothing ever cleaned them up, so a user who
    // opened checkout three times and paid once left two `trial` rows sitting in
    // their Subscription History forever, looking like real subscriptions. They
    // also poisoned the webhook's email fallback, which resolves a payment to
    // "the most recent trial row" — with several to choose from, it could pick
    // the wrong plan.
    await admin
      .from("subscriptions")
      .update({ status: "expired", notes: "Checkout abandoned — superseded by a newer one" })
      .eq("team_id", team_id)
      .eq("status", "trial")
      .eq("is_free", false)
      .not("fanbasis_checkout_session_id", "is", null);

    // Persist a `pending` subscription row so we can resolve webhook events
    // back to a Tappr team even if the checkout was created on a different
    // device than the one that ends up paying.
    await admin.from("subscriptions").insert({
      team_id,
      plan,
      status: "trial", // upgraded to 'active' by the webhook on payment.succeeded
      is_free: false,
      fanbasis_checkout_session_id: session.checkout_session_id,
      fanbasis_product_id: session.id,
      customer_email: authData.user.email || null,
      notes: "Awaiting FanBasis checkout completion",
    });

    await logAuditEvent(admin, {
      eventType: "billing.checkout_started",
      severity: "info",
      description: `Started checkout for ${plan} (€${(cfg.amountCents / 100).toFixed(2)}/mo)`,
      actorUserId: authData.user.id,
      actorEmail: authData.user.email || null,
      teamId: team_id,
      targetUserId: authData.user.id,
      targetEmail: authData.user.email || null,
      source: "api:/billing/checkout",
      metadata: {
        plan,
        amount_cents: cfg.amountCents,
        fanbasis_checkout_session_id: session.checkout_session_id,
        fanbasis_product_id: session.id,
        payment_link: session.payment_link,
      },
    });

    return NextResponse.json({
      payment_link: session.payment_link,
      checkout_session_id: session.checkout_session_id,
    });
  } catch (err) {
    if (err instanceof FanBasisError) {
      return NextResponse.json(
        { error: err.message, errors: err.errors },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "checkout failed" },
      { status: 500 }
    );
  }
}
