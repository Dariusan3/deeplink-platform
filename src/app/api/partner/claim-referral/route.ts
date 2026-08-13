import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePartnerByCode } from "@/lib/partner-codes";

// Authenticated endpoint: associates the just-signed-up user with a
// partner referral code held in localStorage. Used as the fallback
// for Google OAuth signups where we can't put data in user_metadata.

export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({}));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const partner = await resolvePartnerByCode(admin, code);

  if (!partner) return NextResponse.json({ ok: true, claimed: false });

  // Don't credit a partner for referring themselves.
  if (partner.user_id === authData.user.id) {
    return NextResponse.json({ ok: true, claimed: false });
  }

  // Idempotent thanks to UNIQUE(partner_id, referred_user_id).
  const { error } = await admin
    .from("partner_referrals")
    .insert({
      partner_id: partner.id,
      referred_user_id: authData.user.id,
      referred_email: authData.user.email || "",
      status: "pending",
      monthly_value: 0,
    });

  // 23505 = unique_violation, treat as success (already claimed).
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin
    .from("partner_referral_clicks")
    .update({ converted: true })
    .eq("partner_id", partner.id)
    .eq("converted", false)
    .order("clicked_at", { ascending: false })
    .limit(1);

  return NextResponse.json({ ok: true, claimed: true });
}
