import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { validateVanityCode, CODES_PER_PARTNER } from "@/lib/partner-codes";

// POST /api/partner/vanity-code  { code }
//
// Sets the caller's primary referral code. Every code they have previously
// held stays in partner_codes and keeps resolving — see migration 028.
//
// The uniqueness guarantee is the partner_codes primary key, not the
// availability check in the UI. Two partners submitting the same code at the
// same moment both pass a pre-check; the second one loses at the database.

export async function POST(request: NextRequest) {
  const { code } = await request.json().catch(() => ({} as { code?: string }));
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const check = validateVanityCode(code);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
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
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: partner } = await admin
    .from("partner_profiles")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!partner) {
    return NextResponse.json({ error: "not a partner" }, { status: 403 });
  }

  // The insert and the demotion of the previous primary happen inside this
  // function so they cannot interleave against uq_partner_codes_primary and
  // leave the partner with no primary code — which would blank their link.
  const { error } = await admin.rpc("set_partner_primary_code", {
    p_partner_id: partner.id,
    p_code: check.code,
    p_max: CODES_PER_PARTNER,
  });

  if (error) {
    if (error.message.includes("code_taken")) {
      return NextResponse.json({ error: "That code is already taken." }, { status: 409 });
    }
    if (error.message.includes("code_cap")) {
      return NextResponse.json(
        { error: `You can hold at most ${CODES_PER_PARTNER} codes.` },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, code: check.code });
}
