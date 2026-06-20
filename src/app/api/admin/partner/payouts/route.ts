import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/partner/payouts
//
// Lists all partner payout requests with the partner's email + saved
// crypto wallet, so an admin can send the funds and mark them paid.
// Service-role so we can join across partner_profiles + users freely.

export async function GET() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: caller } = await admin
    .from("users").select("is_admin").eq("id", authData.user.id).single();
  if (!caller?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  // Pull payouts + their partner profile (wallet + user_id) in bulk.
  const { data: payouts } = await admin
    .from("partner_payouts")
    .select("id, partner_id, amount, method, status, reference, requested_at, paid_at")
    .order("requested_at", { ascending: false });

  if (!payouts || payouts.length === 0) {
    return NextResponse.json({ payouts: [] });
  }

  const partnerIds = [...new Set(payouts.map((p) => p.partner_id))];
  const { data: profiles } = await admin
    .from("partner_profiles")
    .select("id, user_id, payout_method")
    .in("id", partnerIds);

  const userIds = [...new Set((profiles ?? []).map((p) => p.user_id))];
  const { data: users } = await admin
    .from("users")
    .select("id, email, full_name")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const userById = new Map((users ?? []).map((u) => [u.id, u]));

  const enriched = payouts.map((p) => {
    const profile = profileById.get(p.partner_id);
    const user = profile ? userById.get(profile.user_id) : null;
    const pm = (profile?.payout_method ?? null) as
      | { type?: string; network?: string; wallet_address?: string }
      | null;
    return {
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
      reference: p.reference,
      created_at: p.requested_at,
      paid_at: p.paid_at,
      partner_email: user?.email ?? "—",
      partner_name: user?.full_name ?? null,
      wallet_network: pm?.network ?? null,
      wallet_address: pm?.wallet_address ?? null,
    };
  });

  return NextResponse.json({ payouts: enriched });
}
