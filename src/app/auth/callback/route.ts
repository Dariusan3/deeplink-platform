import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Process referral code if present in user metadata
      const refCode = data.user.user_metadata?.referral_code;
      if (refCode) {
        await processReferral(refCode, data.user.id, data.user.email || "");
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}

async function processReferral(refCode: string, userId: string, email: string) {
  // Use service role to bypass RLS
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return;

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  try {
    // Find the affiliate by referral code
    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("id")
      .eq("referral_code", refCode)
      .eq("is_active", true)
      .single();

    if (!affiliate) return;

    // Check if this user was already referred (prevent duplicates)
    const { count } = await supabase
      .from("affiliate_referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", affiliate.id)
      .eq("referred_email", email);

    if ((count ?? 0) > 0) return;

    // Create the referral record
    await supabase.from("affiliate_referrals").insert({
      referrer_id: affiliate.id,
      referred_user_id: userId,
      referred_email: email,
      status: "pending",
      plan: null,
      plan_price: 0,
      commission_rate: 0,
    });
  } catch (err) {
    console.error("Failed to process referral:", err);
  }
}
