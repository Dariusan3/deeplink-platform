import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TAPPR_PLANS, type TapprPlan } from "@/lib/fanbasis";
import { invalidateOwnerQuota } from "@/lib/click-quota";
import { logAuditEvent, type AuditEventType, type AuditSeverity } from "@/lib/audit";

// FanBasis webhook receiver. The exact signature header/algorithm isn't in
// the public docs, so we accept the request if EITHER of these matches:
//   1. Body HMAC-SHA256 signed with FANBASIS_WEBHOOK_SECRET, sent as
//      `x-webhook-signature` (or `x-fanbasis-signature`) header
//   2. The raw secret is sent in `x-webhook-secret` (some panels do this)
// First real event we receive will tell us which form FanBasis uses, and we
// can drop the other branch.
//
// We also log the headers + raw body of the very first event we receive so
// we can confirm the format — the log line is gated on the `notes` field.

export async function POST(request: NextRequest) {
  const secret = process.env.FANBASIS_WEBHOOK_SECRET || "";
  const raw = await request.text();

  const sigHeader =
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-fanbasis-signature") ||
    "";
  const secretHeader = request.headers.get("x-webhook-secret") || "";

  const computed = secret
    ? crypto.createHmac("sha256", secret).update(raw).digest("hex")
    : "";

  // Constant-time compare for the HMAC branch.
  const hmacOk =
    !!secret &&
    !!sigHeader &&
    sigHeader.length === computed.length &&
    crypto.timingSafeEqual(Buffer.from(sigHeader), Buffer.from(computed));

  const sharedOk = !!secret && secretHeader === secret;

  if (!hmacOk && !sharedOk) {
    // Surface the headers we DID receive in the response body — only useful
    // while we're still figuring out the signing format. Remove once stable.
    console.warn("[fanbasis-webhook] signature check failed", {
      sigHeader: sigHeader || null,
      secretHeader: secretHeader ? "present" : null,
      bodyPreview: raw.slice(0, 200),
    });
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event_type?: string; api_metadata?: { data?: Record<string, string> } } & Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // TEMP: log the full event payload so we can see which fields
  // FanBasis actually sends. Remove once the field map is confirmed.
  console.log("[fanbasis-webhook] raw event:", JSON.stringify(event, null, 2));

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Match the event back to the trial subscription row we created in
  // /api/billing/checkout. Order of preference:
  //   1. api_metadata.data.team_id + plan we set when creating the session
  //   2. fanbasis_subscription_id (set after first subscription.created)
  //   3. fanbasis_checkout_session_id (numeric — top-level field on event)
  const md = event.api_metadata?.data || {};
  const teamId = md.team_id;
  const planFromMd = md.plan as TapprPlan | undefined;
  // user_id is set by /api/billing/checkout so we know which user paid —
  // used below to look up an open partner_referrals row and credit the
  // partner who brought them in.
  const payerUserId = md.user_id;
  const checkoutSessionId =
    (event as Record<string, unknown>).checkout_session_id ??
    (typeof event.item === "object" && event.item ? (event.item as { id?: number }).id : undefined);
  const fbSubscriptionId =
    (event as Record<string, unknown>).subscription_id ?? null;

  const eventType = event.event_type || (event as { type?: string }).type;

  // Hoisted so the audit-log section at the end of the handler can see
  // the values resolved inside the payment-success branch (where we
  // look up the trial row by buyer email when FanBasis doesn't echo
  // back api_metadata).
  let resolvedPlan: TapprPlan | undefined = planFromMd;
  let resolvedTeamId: string | undefined = teamId;
  let resolvedPayerUserId: string | undefined = payerUserId;
  let resolvedTargetEmail: string | null = null;

  switch (eventType) {
    case "payment.succeeded":
    case "subscription.created":
    case "subscription.renewed": {
      // Mark the trial row as active and stamp the renewal date one
      // billing period out. If we can't find a trial row, create one
      // (covers the "buyer pays from a different account" edge).
      const periodDays = 30;
      const expiresAt = new Date(Date.now() + periodDays * 86_400_000).toISOString();

      // Try the cleanest match first: checkout_session_id /
      // subscription_id from the event payload. FanBasis sometimes omits
      // these on the first events, so we also fall back to the most
      // recent trial row for the buyer's email — that's enough to map
      // back to OUR tenant because /api/billing/checkout creates the
      // trial row with `customer_email` already populated.
      const buyerEmail =
        typeof event.buyer === "object" && event.buyer
          ? (event.buyer as { email?: string }).email ?? null
          : null;

      let existing: { id: string; team_id: string; plan: string } | null = null;

      if (checkoutSessionId || fbSubscriptionId) {
        const { data } = await admin
          .from("subscriptions")
          .select("id, team_id, plan")
          .or(
            [
              checkoutSessionId ? `fanbasis_checkout_session_id.eq.${checkoutSessionId}` : null,
              fbSubscriptionId ? `fanbasis_subscription_id.eq.${fbSubscriptionId}` : null,
            ]
              .filter(Boolean)
              .join(",")
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existing = data ?? null;
      }

      // Fallback: latest trial row for this buyer's email. Necessary
      // because FanBasis is currently sending events without our
      // api_metadata or session ids, so without this the trial row
      // never gets activated.
      if (!existing && buyerEmail) {
        const { data } = await admin
          .from("subscriptions")
          .select("id, team_id, plan")
          .eq("customer_email", buyerEmail)
          .eq("status", "trial")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        existing = data ?? null;
      }

      // Resolve plan + payer from the matched subscription (the most
      // reliable source) before falling back to metadata. The trial row
      // already knows which plan was bought and which team owns it —
      // we don't need FanBasis to tell us. Reuses the hoisted resolved*
      // vars so the audit-log section below can read them too.
      if (existing) {
        resolvedPlan = (existing.plan as TapprPlan) || resolvedPlan;
        resolvedTeamId = existing.team_id || resolvedTeamId;
        // If we don't already have the payer from metadata, look up the
        // owner of the matched team. Owner = the user who started the
        // checkout in /api/billing/checkout.
        if (!resolvedPayerUserId) {
          const { data: owner } = await admin
            .from("team_members")
            .select("user_id")
            .eq("team_id", existing.team_id)
            .eq("role", "owner")
            .limit(1)
            .maybeSingle();
          resolvedPayerUserId = owner?.user_id ?? undefined;
        }

        await admin
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: expiresAt,
            fanbasis_subscription_id: fbSubscriptionId ?? undefined,
            notes: `Activated by ${eventType}`,
          })
          .eq("id", existing.id);
      } else if (resolvedTeamId && resolvedPlan) {
        await admin.from("subscriptions").insert({
          team_id: resolvedTeamId,
          plan: resolvedPlan,
          status: "active",
          is_free: false,
          starts_at: new Date().toISOString(),
          expires_at: expiresAt,
          fanbasis_checkout_session_id: checkoutSessionId
            ? Number(checkoutSessionId)
            : null,
          fanbasis_subscription_id: fbSubscriptionId ? Number(fbSubscriptionId) : null,
          notes: `Created by ${eventType} (no prior trial row)`,
        });
      }

      // Credit the referring partner (if any). Only fires on the FIRST
      // payment for the referral — the partner_referrals row goes from
      // "pending" to "converted" and a one-time commission is logged.
      // Renewal events skip the partner_earnings insert since the row is
      // already "converted". Uses the resolved payer/plan so it works
      // even when FanBasis sends empty api_metadata.
      if (resolvedPayerUserId && resolvedPlan) {
        await creditPartnerOnPaidSignup(admin, resolvedPayerUserId, resolvedPlan).catch((err) => {
          console.error("[fanbasis-webhook] partner credit failed", err);
        });
      }
      break;
    }

    case "subscription.canceled":
    case "subscription.completed": {
      const filter =
        fbSubscriptionId
          ? { col: "fanbasis_subscription_id", val: fbSubscriptionId }
          : checkoutSessionId
            ? { col: "fanbasis_checkout_session_id", val: checkoutSessionId }
            : null;
      if (filter) {
        await admin
          .from("subscriptions")
          .update({
            status: "cancelled",
            notes: `${eventType} via webhook`,
          })
          .eq(filter.col, filter.val);
      }
      break;
    }

    case "payment.failed":
    case "payment.canceled":
    case "payment.expired": {
      // Don't downgrade the team yet — these can be transient (retry, etc.)
      // We just stamp the row's notes for visibility in the billing UI.
      const filter = checkoutSessionId
        ? { col: "fanbasis_checkout_session_id", val: checkoutSessionId }
        : null;
      if (filter) {
        await admin
          .from("subscriptions")
          .update({ notes: `Last event: ${eventType} at ${new Date().toISOString()}` })
          .eq(filter.col, filter.val);
      }
      break;
    }

    default:
      console.log("[fanbasis-webhook] unhandled event:", eventType);
  }

  // Audit every recognised FanBasis event so admin sees the full timeline
  // — succeeded, failed, cancelled, etc. — even when nothing changes in
  // the subscriptions table.
  if (eventType && AUDIT_MAP[eventType]) {
    const map = AUDIT_MAP[eventType];
    // Prefer the resolved plan (from the matched trial row) over the
    // metadata one — FanBasis often sends empty api_metadata so the
    // resolved value is the only one we'll have.
    const planLabel = resolvedPlan ? ` ${resolvedPlan}` : "";
    const amount = (event as Record<string, unknown>).amount;
    const amountLabel = typeof amount === "number" ? ` (€${amount})` : "";

    let buyerName: string | null = null;
    if (typeof event.buyer === "object" && event.buyer) {
      const b = event.buyer as { email?: string; name?: string };
      resolvedTargetEmail = b.email ?? null;
      buyerName = b.name ?? null;
    }

    await logAuditEvent(admin, {
      eventType: map.type,
      severity: map.severity,
      description: `${map.label}${planLabel}${amountLabel}${buyerName ? ` — ${buyerName}` : ""}`,
      teamId: resolvedTeamId || null,
      targetUserId: resolvedPayerUserId || null,
      targetEmail: resolvedTargetEmail,
      source: "webhook:fanbasis",
      metadata: {
        event_type: eventType,
        checkout_session_id: checkoutSessionId,
        subscription_id: fbSubscriptionId,
        amount,
        plan: resolvedPlan,
        api_metadata: md,
      },
    });
  }

  // Anything we did above that touched `subscriptions` may have moved the plan:
  // the sync_team_plan DB trigger (migration 024) recomputes the owner's best
  // plan and writes it across all their teams, with no application code in the
  // loop. That plan feeds the monthly click cap, whose verdict the redirect path
  // caches per team — so it has to be dropped here, on renew and on cancel
  // alike. Non-fatal: the cache is TTL-bounded anyway.
  if (resolvedTeamId) {
    await invalidateOwnerQuota(admin, resolvedTeamId).catch((err) => {
      console.error("Quota cache invalidation failed after FanBasis webhook:", err);
    });
  }

  return NextResponse.json({ received: true });
}

// Translate FanBasis webhook event types → our audit taxonomy + UI tone.
const AUDIT_MAP: Record<string, { type: AuditEventType; label: string; severity: AuditSeverity }> = {
  "payment.succeeded":      { type: "payment.succeeded",      label: "Payment succeeded",       severity: "success" },
  "payment.failed":         { type: "payment.failed",         label: "Payment failed",          severity: "error"   },
  "payment.canceled":       { type: "payment.canceled",       label: "Payment canceled",        severity: "warning" },
  "payment.expired":        { type: "payment.expired",        label: "Payment expired",         severity: "warning" },
  "subscription.created":   { type: "subscription.created",   label: "Subscription created",    severity: "success" },
  "subscription.renewed":   { type: "subscription.renewed",   label: "Subscription renewed",    severity: "success" },
  "subscription.canceled":  { type: "subscription.canceled",  label: "Subscription canceled",   severity: "warning" },
  "subscription.completed": { type: "subscription.completed", label: "Subscription completed",  severity: "info"    },
};

// When a paid subscription succeeds for a user who was originally
// referred by a partner, convert the open `partner_referrals` row and
// log a one-time commission in `partner_earnings`. Idempotent —
// re-running for the same referral becomes a no-op because we only
// process rows with status="pending".
async function creditPartnerOnPaidSignup(
  admin: SupabaseClient,
  payerUserId: string,
  plan: TapprPlan
) {
  // Find the open referral for this buyer.
  const { data: referral } = await admin
    .from("partner_referrals")
    .select("id, partner_id, status")
    .eq("referred_user_id", payerUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (!referral) return; // not a referred signup, or already credited

  const { data: partner } = await admin
    .from("partner_profiles")
    .select("id, commission_rate, pending_payout, total_earned")
    .eq("id", referral.partner_id)
    .single();

  if (!partner) return;

  const monthlyValueCents = TAPPR_PLANS[plan].amountCents;
  const monthlyValue = monthlyValueCents / 100;
  const commission = monthlyValue * Number(partner.commission_rate);

  // 1. Flip the referral to its converted state. The status check
  //    constraint allows only 'pending' | 'active' | 'churned' —
  //    'active' is the converted state. (Using 'converted' silently
  //    failed: the JS client returns the error in the response rather
  //    than throwing, so the referral stayed 'pending'.)
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
    console.error("[fanbasis-webhook] referral convert failed", updErr);
    return;
  }

  // 2. Idempotency — skip if an earning already exists for this referral
  //    (activate endpoint + webhook can both fire for one payment).
  const { data: existingEarning } = await admin
    .from("partner_earnings")
    .select("id")
    .eq("referral_id", referral.id)
    .maybeSingle();
  if (existingEarning) return;

  // 3. Log the commission. period_month is the 1st of this month so we
  //    can sum monthly earnings later for payouts.
  const now = new Date();
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  await admin.from("partner_earnings").insert({
    partner_id: partner.id,
    referral_id: referral.id,
    amount: commission,
    period_month: periodMonth,
    status: "pending",
    type: "commission",
  });

  // 3. Recompute the partner's running totals from the earnings table.
  //    Summing (not incrementing) keeps pending_payout / total_earned
  //    drift-proof no matter which path credited (webhook vs
  //    /api/billing/activate), and is idempotent on retries.
  {
    const { data: allEarnings } = await admin
      .from("partner_earnings")
      .select("amount, status")
      .eq("partner_id", partner.id);
    const rows = (allEarnings ?? []) as { amount: number; status: string }[];
    const total = rows.reduce((s, e) => s + Number(e.amount), 0);
    const pending = rows
      .filter((e) => e.status === "pending")
      .reduce((s, e) => s + Number(e.amount), 0);
    await admin
      .from("partner_profiles")
      .update({ total_earned: total, pending_payout: pending })
      .eq("id", partner.id);
  }

  // Audit the commission so admin sees who got paid when on the activity
  // page (separate from the payment.succeeded event for the buyer).
  await logAuditEvent(admin, {
    eventType: "partner.commission_paid",
    severity: "success",
    description: `Partner earned €${commission.toFixed(2)} commission on ${plan} signup`,
    targetUserId: payerUserId,
    source: "webhook:fanbasis",
    metadata: {
      partner_id: partner.id,
      referral_id: referral.id,
      commission_amount: commission,
      monthly_value: monthlyValue,
      commission_rate: Number(partner.commission_rate),
      plan,
    },
  });
}
