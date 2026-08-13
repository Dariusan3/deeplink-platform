import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";
import { generateAutoCode, registerPrimaryCode } from "@/lib/partner-codes";

// POST /api/partner/repair-profile
//
// Self-heal endpoint for the rare case where `users.is_partner=true` but
// the `partner_profiles` row is missing (e.g. after a hard delete of
// auth.users that cascade-dropped the profile, followed by resignup with
// the same email which re-set the flag).
//
// Idempotent: if a profile already exists, returns it without changes.
// Otherwise creates one with a fresh referral_code.

export async function POST() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const userId = authData.user.id;

  // Caller must already be flagged as a partner — otherwise this is a
  // brand-new user trying to bypass activation; reject.
  const { data: u } = await admin
    .from("users")
    .select("is_partner")
    .eq("id", userId)
    .single();
  if (!u?.is_partner) {
    return NextResponse.json({ error: "not a partner — activate first" }, { status: 403 });
  }

  // Profile already exists? Return it.
  const { data: existing } = await admin
    .from("partner_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, profile: existing, repaired: false });
  }

  const referralCode = await generateAutoCode(admin);

  const now = new Date().toISOString();
  const { data: profile, error } = await admin
    .from("partner_profiles")
    .insert({
      user_id: userId,
      referral_code: referralCode,
      commission_rate: PARTNER_COMMISSION_RATE,
      activated_at: now,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await registerPrimaryCode(admin, profile.id, referralCode);

  // Also stamp partner_activated_at if it was null — keeps the audit
  // trail consistent ("when did this user become a partner").
  await admin
    .from("users")
    .update({ partner_activated_at: now })
    .eq("id", userId)
    .is("partner_activated_at", null);

  return NextResponse.json({ ok: true, profile, repaired: true });
}
