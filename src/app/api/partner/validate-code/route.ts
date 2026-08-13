import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePartnerByCode } from "@/lib/partner-codes";

// GET /api/partner/validate-code?code=XXX
// Public — used by the invite-only Free plan pop-up to check a partner
// referral code is real before letting someone sign up for free.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ valid: false, error: "server" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const partner = await resolvePartnerByCode(admin, code);

  return NextResponse.json({ valid: !!partner });
}
