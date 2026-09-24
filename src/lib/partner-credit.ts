import type { SupabaseClient } from "@supabase/supabase-js";
import { TAPPR_PLANS, type TapprPlan } from "@/lib/fanbasis";
import { logAuditEvent } from "@/lib/audit";

// Billing periods are 30 days, so two payments for one referral are never
// closer than ~30 days apart. Anything inside this window is the same payment
// arriving twice (webhook + success redirect), not a renewal. A calendar-month
// key would skip a payment whenever a 30-day cycle lands twice in one month.
const SAME_PAYMENT_WINDOW_MS = 20 * 86_400_000;

// Credits the referring partner their commission for ONE payment by the
// referred user. Called on the first payment and on every renewal.
export async function creditPartnerForPayment(
  admin: SupabaseClient,
  payerUserId: string,
  plan: TapprPlan,
  source: string
) {
  const { data: referral } = await admin
    .from("partner_referrals")
    .select("id, partner_id, status")
    .eq("referred_user_id", payerUserId)
    .in("status", ["pending", "active"])
    .maybeSingle();
  if (!referral) return; // not a referred signup, or churned

  const { data: partner } = await admin
    .from("partner_profiles")
    .select("id, commission_rate")
    .eq("id", referral.partner_id)
    .single();
  if (!partner) return;

  const monthlyValue = TAPPR_PLANS[plan].amountCents / 100;
  const commission = monthlyValue * Number(partner.commission_rate);

  // Skip if this payment was already credited (webhook + activate both fire
  // for one payment, and FanBasis may retry).
  const since = new Date(Date.now() - SAME_PAYMENT_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from("partner_earnings")
    .select("id")
    .eq("referral_id", referral.id)
    .eq("type", "commission")
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) return;

  // The status check constraint allows only 'pending' | 'active' | 'churned';
  // 'active' is the paying state. converted_at is only stamped on the first
  // payment. plan/monthly_value follow the latest payment (plan changes).
  const { error: updErr } = await admin
    .from("partner_referrals")
    .update({
      status: "active",
      plan,
      monthly_value: monthlyValue,
      ...(referral.status === "pending" ? { converted_at: new Date().toISOString() } : {}),
    })
    .eq("id", referral.id);
  if (updErr) {
    console.error(`[${source}] referral update failed`, updErr);
    return;
  }

  const now = new Date();
  const periodMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const { error: insErr } = await admin.from("partner_earnings").insert({
    partner_id: partner.id,
    referral_id: referral.id,
    amount: commission,
    period_month: periodMonth,
    status: "pending",
    type: "commission",
  });
  if (insErr) {
    console.error(`[${source}] earning insert failed`, insErr);
    return;
  }

  // Sum (not increment) so totals stay drift-proof whichever path credited.
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

  await logAuditEvent(admin, {
    eventType: "partner.commission_paid",
    severity: "success",
    description: `Partner earned €${commission.toFixed(2)} commission on ${plan} payment`,
    targetUserId: payerUserId,
    source,
    metadata: {
      partner_id: partner.id,
      referral_id: referral.id,
      commission_amount: commission,
      monthly_value: monthlyValue,
      commission_rate: Number(partner.commission_rate),
      plan,
      first_payment: referral.status === "pending",
    },
  });
}
