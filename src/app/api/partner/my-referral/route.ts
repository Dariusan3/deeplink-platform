import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/partner/my-referral
//
// Tells the dashboard whether the signed-in user arrived through a partner
// link and has not paid yet — the only accounts that get the upgrade banner.
// partner_referrals is RLS-restricted to the partner who owns the row, so the
// referred user cannot read their own row from the browser; hence this route.
// Returns a boolean only: nothing about the partner leaves the server.
export async function GET() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data } = await admin
    .from("partner_referrals")
    .select("id")
    .eq("referred_user_id", authData.user.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ pendingReferral: !!data });
}
