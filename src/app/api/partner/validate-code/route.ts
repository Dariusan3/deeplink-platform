import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePartnerByCode, partnerDisplayName } from "@/lib/partner-codes";

// GET /api/partner/validate-code?code=XXX
// Public — used by the invite gate and the Free plan pop-up to check a partner
// referral code is real before letting someone sign up.
//
// Rate limited per IP. This used to answer with a bare boolean; it now also
// returns the partner's name, which is the same thing /signup/<code> shows to
// anyone who follows the link — but a public endpoint that hands out names one
// guess at a time should not be free to hammer. Same in-memory pattern as
// /api/partner/track-click.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 60;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimitMap) if (now > v.resetAt) rateLimitMap.delete(k);
}, WINDOW_MS);

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ valid: false }, { status: 429 });
  }

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
  if (!partner) return NextResponse.json({ valid: false });

  // The name is what the referred visitor is shown ("Referred by Andrei"),
  // so it travels with the validity answer rather than costing a second call.
  // Null when the partner never set one; the UI falls back to the code.
  const name = await partnerDisplayName(admin, partner.user_id);

  return NextResponse.json({ valid: true, name });
}
