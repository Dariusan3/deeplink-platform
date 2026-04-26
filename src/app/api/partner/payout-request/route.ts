import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const MIN_PAYOUT = 50;

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const { amount } = await request.json().catch(() => ({}));
  const reqAmount = Number(amount);
  if (!reqAmount || reqAmount < MIN_PAYOUT) {
    return NextResponse.json(
      { error: `Minimum payout is $${MIN_PAYOUT}` },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: profile } = await admin
    .from("partner_profiles")
    .select("id, pending_payout, payout_method")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "not a partner" }, { status: 403 });
  }
  if (!profile.payout_method) {
    return NextResponse.json(
      { error: "Set a payout method first" },
      { status: 400 }
    );
  }
  if (Number(profile.pending_payout) < reqAmount) {
    return NextResponse.json(
      { error: "Insufficient pending balance" },
      { status: 400 }
    );
  }

  const method =
    typeof profile.payout_method === "object" && profile.payout_method !== null
      ? (profile.payout_method as { type?: string }).type ?? "unknown"
      : "unknown";

  const { error } = await admin.from("partner_payouts").insert({
    partner_id: profile.id,
    amount: reqAmount,
    method,
    status: "requested",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
