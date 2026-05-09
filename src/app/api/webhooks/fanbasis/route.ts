import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
  const planFromMd = md.plan;
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

      const { data: existing } = await admin
        .from("subscriptions")
        .select("id, team_id, plan")
        .or(
          [
            checkoutSessionId ? `fanbasis_checkout_session_id.eq.${checkoutSessionId}` : null,
            fbSubscriptionId ? `fanbasis_subscription_id.eq.${fbSubscriptionId}` : null,
          ]
            .filter(Boolean)
            .join(",") || "id.is.null"
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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

  return NextResponse.json({ received: true });
}
