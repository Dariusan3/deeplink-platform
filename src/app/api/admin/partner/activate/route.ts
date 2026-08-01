import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendPartnerWelcomeEmail } from "@/lib/email";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";

// Admin-only: turns is_partner=true on a user, creates partner_profiles row
// with a fresh referral code, sends Welcome email. Idempotent.
export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // Admin gate via the existing RLS-bypassing service client.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: caller } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", authData.user.id)
    .single();
  if (!caller?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { user_id } = await request.json().catch(() => ({}));
  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const { data: target } = await admin
    .from("users")
    .select("id, email, full_name, is_partner")
    .eq("id", user_id)
    .single();
  if (!target) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  // A partner_profiles row can already exist independently of the
  // is_partner flag — e.g. the user was deactivated (flag flipped to
  // false) but the profile row was kept (DELETE only toggles the flag).
  // Re-activating must NOT blindly INSERT or we hit
  // partner_profiles_user_id_key. So: if a profile exists for this
  // user_id, reuse it (keeping the same referral_code so existing
  // referral links don't break). Only INSERT when truly absent.
  const { data: existingProfile } = await admin
    .from("partner_profiles")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();

  const now = new Date().toISOString();
  let profile = existingProfile;

  if (!existingProfile) {
    // Generate a unique 8-char referral code (retry on rare collision).
    let referralCode = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      referralCode = Math.random().toString(36).slice(2, 10);
      const { data: clash } = await admin
        .from("partner_profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!clash) break;
    }

    const { data: created, error: profileErr } = await admin
      .from("partner_profiles")
      .insert({
        user_id,
        referral_code: referralCode,
        commission_rate: PARTNER_COMMISSION_RATE,
        activated_at: now,
      })
      .select()
      .single();

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }
    profile = created;
  }

  await admin
    .from("users")
    .update({ is_partner: true, partner_activated_at: now })
    .eq("id", user_id);

  // Welcome email — best-effort, don't fail activation if email fails.
  // Only send for a freshly-created profile (not a reactivation of an
  // existing one) so we don't spam returning partners. Uses the
  // profile's referral_code, which works whether it was just created
  // or reused.
  if (target.email && !existingProfile && profile) {
    const origin = request.nextUrl.origin;
    sendPartnerWelcomeEmail({
      to: target.email,
      name: target.full_name || target.email.split("@")[0],
      referralUrl: `${origin}/?ref=${(profile as { referral_code: string }).referral_code}`,
    }).catch((err) => console.error("Welcome email failed:", err));
  }

  return NextResponse.json({ ok: true, profile, alreadyActive: !!existingProfile });
}

// DELETE = deactivate partner (does not delete data, just flips flag).
export async function DELETE(request: NextRequest) {
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

  const { data: caller } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", authData.user.id)
    .single();
  if (!caller?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const { user_id } = await request.json().catch(() => ({}));
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  await admin
    .from("users")
    .update({ is_partner: false })
    .eq("id", user_id);

  return NextResponse.json({ ok: true });
}
