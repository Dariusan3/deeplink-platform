import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { type TapprPlan } from "@/lib/fanbasis";
import { planRank } from "@/lib/plans";
import { invalidateOwnerQuota } from "@/lib/click-quota";
import { logAuditEvent, type AuditEventType, type AuditSeverity } from "@/lib/audit";
import { creditPartnerForPayment } from "@/lib/partner-credit";

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
    console.warn("[fanbasis-webhook] signature check failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event_type?: string; api_metadata?: { data?: Record<string, string> } } & Record<string, unknown>;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

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
      // The row this event ends up activating — used below to retire whatever
      // subscription the team was on before the switch.
      let activatedId: string | null = null;
      let activatedTeamId: string | null = null;

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

      // Renewal fallback: the row is already 'active' (not 'trial') and the
      // event may carry no subscription id, so match the buyer's most recent
      // paid row by email. Without this a renewal can't be tied to a payer
      // and the partner would go uncredited.
      if (!existing && buyerEmail) {
        const { data } = await admin
          .from("subscriptions")
          .select("id, team_id, plan")
          .eq("customer_email", buyerEmail)
          .eq("is_free", false)
          .in("status", ["active", "expired"])
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
        activatedId = existing.id;
        activatedTeamId = existing.team_id;
      } else if (resolvedTeamId && resolvedPlan) {
        const { data: created } = await admin
          .from("subscriptions")
          .insert({
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
          })
          .select("id")
          .maybeSingle();
        activatedId = created?.id ?? null;
        activatedTeamId = resolvedTeamId;
      }

      // Supersede prior paid subscriptions — but ONLY on an upgrade (or same
      // rank). On a DOWNGRADE the old, higher plan must keep running until the
      // period it was paid for ends: owner_best_plan() picks the highest active,
      // non-expired subscription, so leaving the higher one alone keeps the user
      // on it until its `expires_at` lapses, then the new lower plan takes over.
      // That is the whole "keep the plan you paid for until it's done" behavior.
      //
      // On a renewal this is a no-op: the renewed row IS the activated one.
      // `is_free` rows (admin grants) are never touched here.
      if (activatedId && activatedTeamId && resolvedPlan) {
        const newRank = planRank(resolvedPlan);
        const { data: priorPaid } = await admin
          .from("subscriptions")
          .select("id, plan")
          .eq("team_id", activatedTeamId)
          .eq("status", "active")
          .eq("is_free", false)
          .neq("id", activatedId);

        // Cancel only prior subs the new one actually supersedes (rank <= new).
        // A higher-rank prior sub is a downgrade target and rides to expiry.
        const supersededIds = (priorPaid ?? [])
          .filter((r) => planRank(r.plan) <= newRank)
          .map((r) => r.id);

        if (supersededIds.length > 0) {
          await admin
            .from("subscriptions")
            .update({
              status: "cancelled",
              notes: `Superseded by a switch to ${resolvedPlan}`,
            })
            .in("id", supersededIds);
        }
      }

      // Credit the referring partner (if any) on EVERY payment — first
      // purchase and each renewal. Duplicate deliveries of the same payment
      // are deduped inside creditPartnerForPayment. Uses the resolved
      // payer/plan so it works even when FanBasis sends empty api_metadata.
      if (resolvedPayerUserId && resolvedPlan) {
        await creditPartnerForPayment(admin, resolvedPayerUserId, resolvedPlan, "webhook:fanbasis").catch((err) => {
          console.error("[fanbasis-webhook] partner credit failed", err);
        });
      }
      break;
    }

    case "subscription.canceled": {
      // The user turned off auto-renew. They already paid for the current
      // period, so DON'T drop them now — keep the subscription active until its
      // `expires_at`, then let it lapse (the finalizer in the anomaly-check cron
      // expires it, and owner_best_plan drops the plan). This is what stops a
      // cancel from immediately yanking a plan the user already paid for.
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
            cancel_at_period_end: true,
            notes: "Auto-renew off — active until period end, then lapses",
          })
          .eq(filter.col, filter.val)
          .eq("status", "active");
      }
      break;
    }

    case "subscription.completed": {
      // The subscription actually reached its end at FanBasis — expire it now so
      // owner_best_plan recomputes and the plan drops.
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
            status: "expired",
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
