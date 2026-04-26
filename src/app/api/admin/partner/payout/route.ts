import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendPartnerPayoutConfirmedEmail } from "@/lib/email";

// Admin-only: marks a payout as paid. Decrements pending_payout, adds to
// total_earned. Sends confirmation email.
export async function PATCH(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: caller } = await admin
    .from("users").select("is_admin").eq("id", authData.user.id).single();
  if (!caller?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { payout_id, reference, status } = await request.json().catch(() => ({}));
  if (!payout_id) return NextResponse.json({ error: "payout_id required" }, { status: 400 });

  const newStatus = status === "rejected" ? "rejected" : "paid";

  const { data: payout, error: fetchErr } = await admin
    .from("partner_payouts")
    .select("*, partner:partner_profiles!inner(id, user_id)")
    .eq("id", payout_id)
    .single();

  if (fetchErr || !payout) {
    return NextResponse.json({ error: "payout not found" }, { status: 404 });
  }
  if (payout.status !== "requested") {
    return NextResponse.json({ error: "already processed" }, { status: 400 });
  }

  const { error: updErr } = await admin
    .from("partner_payouts")
    .update({
      status: newStatus,
      reference: reference || null,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", payout_id);

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  if (newStatus === "paid") {
    // Update partner balances: pending_payout -= amount, total_earned += amount.
    const partnerId = payout.partner.id;
    const { data: profile } = await admin
      .from("partner_profiles")
      .select("pending_payout, total_earned")
      .eq("id", partnerId)
      .single();
    if (profile) {
      await admin
        .from("partner_profiles")
        .update({
          pending_payout: Math.max(0, Number(profile.pending_payout) - Number(payout.amount)),
          total_earned: Number(profile.total_earned) + Number(payout.amount),
        })
        .eq("id", partnerId);
    }

    // Mark all pending earnings as paid (best-effort).
    await admin
      .from("partner_earnings")
      .update({ status: "paid" })
      .eq("partner_id", partnerId)
      .eq("status", "pending");

    // Confirmation email.
    const { data: partnerUser } = await admin
      .from("users")
      .select("email, full_name")
      .eq("id", payout.partner.user_id)
      .single();
    if (partnerUser?.email) {
      sendPartnerPayoutConfirmedEmail({
        to: partnerUser.email,
        name: partnerUser.full_name || partnerUser.email.split("@")[0],
        amount: Number(payout.amount),
        method: payout.method || "—",
        reference: reference || null,
      }).catch((err) => console.error("Payout email failed:", err));
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
