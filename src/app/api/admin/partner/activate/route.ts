import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { sendPartnerWelcomeEmail } from "@/lib/email";

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

  // Already a partner? Return existing profile — but if the profile is
  // missing (can happen after a manual delete-and-resignup or any
  // cascade that dropped partner_profiles), fall through to the
  // create path so we self-heal instead of permanently breaking the
  // partner page.
  if (target.is_partner) {
    const { data: existing } = await admin
      .from("partner_profiles")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, profile: existing, alreadyActive: true });
    }
    // is_partner=true but no profile → broken state. Continue to the
    // create-profile branch below so this request repairs it.
  }

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

  const now = new Date().toISOString();

  const { data: profile, error: profileErr } = await admin
    .from("partner_profiles")
    .insert({
      user_id,
      referral_code: referralCode,
      commission_rate: 0.25,
      activated_at: now,
    })
    .select()
    .single();

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  await admin
    .from("users")
    .update({ is_partner: true, partner_activated_at: now })
    .eq("id", user_id);

  // Welcome email — best-effort, don't fail activation if email fails.
  if (target.email) {
    const origin = request.nextUrl.origin;
    sendPartnerWelcomeEmail({
      to: target.email,
      name: target.full_name || target.email.split("@")[0],
      referralUrl: `${origin}/?ref=${referralCode}`,
    }).catch((err) => console.error("Welcome email failed:", err));
  }

  return NextResponse.json({ ok: true, profile, alreadyActive: false });
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
