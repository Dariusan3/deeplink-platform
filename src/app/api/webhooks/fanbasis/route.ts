import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TAPPR_PLANS, type TapprPlan } from "@/lib/fanbasis";
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

      if (existing) {
        await admin
          .from("subscriptions")
          .update({
            status: "active",
            expires_at: expiresAt,
            fanbasis_subscription_id: fbSubscriptionId ?? undefined,
            notes: `Activated by ${eventType}`,
          })
          .eq("id", existing.id);
      } else if (teamId && planFromMd) {
        await admin.from("subscriptions").insert({
          team_id: teamId,
          plan: planFromMd,
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
      // already "converted".
      if (payerUserId && planFromMd) {
        await creditPartnerOnPaidSignup(admin, payerUserId, planFromMd).catch((err) => {
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
    const planLabel = planFromMd ? ` ${planFromMd}` : "";
    const amount = (event as Record<string, unknown>).amount;
    const amountLabel = typeof amount === "number" ? ` ($${amount})` : "";

    let targetEmail: string | null = null;
    let buyerName: string | null = null;
    if (typeof event.buyer === "object" && event.buyer) {
      const b = event.buyer as { email?: string; name?: string };
      targetEmail = b.email ?? null;
      buyerName = b.name ?? null;
    }

    await logAuditEvent(admin, {
      eventType: map.type,
      severity: map.severity,
      description: `${map.label}${planLabel}${amountLabel}${buyerName ? ` — ${buyerName}` : ""}`,
      teamId: teamId || null,
      targetUserId: payerUserId || null,
      targetEmail,
      source: "webhook:fanbasis",
      metadata: {
        event_type: eventType,
        checkout_session_id: checkoutSessionId,
        subscription_id: fbSubscriptionId,
        amount,
        plan: planFromMd,
        api_metadata: md,
      },
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

  // 1. Flip the referral to converted with the plan + value.
  await admin
    .from("partner_referrals")
    .update({
      status: "converted",
      plan,
      monthly_value: monthlyValue,
      converted_at: new Date().toISOString(),
    })
    .eq("id", referral.id);

  // 2. Log the commission. period_month is the 1st of this month so we
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

  // 3. Bump the partner's running totals so the Earnings page shows
  //    the new commission immediately (without summing on each load).
  await admin
    .from("partner_profiles")
    .update({
      pending_payout: Number(partner.pending_payout) + commission,
      total_earned: Number(partner.total_earned) + commission,
    })
    .eq("id", partner.id);

  // Audit the commission so admin sees who got paid when on the activity
  // page (separate from the payment.succeeded event for the buyer).
  await logAuditEvent(admin, {
    eventType: "partner.commission_paid",
    severity: "success",
    description: `Partner earned $${commission.toFixed(2)} commission on ${plan} signup`,
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
