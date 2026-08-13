import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { validateVanityCode, resolvePartnerByCode } from "@/lib/partner-codes";

// GET /api/partner/vanity-code/available?code=xxx
//
// Backs the live indicator next to the input in partner Settings. This is a
// convenience, never the guarantee: uniqueness is enforced by the
// partner_codes primary key when the code is actually set.
//
// Authenticated and rate limited on purpose. Left open, it is a free oracle
// for enumerating which codes are taken.

const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export async function GET(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  if (rateLimited(authData.user.id)) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const raw = request.nextUrl.searchParams.get("code") ?? "";
  const check = validateVanityCode(raw);
  if (!check.ok) {
    return NextResponse.json({ available: false, reason: check.reason });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const owner = await resolvePartnerByCode(admin, check.code);

  if (!owner) {
    return NextResponse.json({ available: true, code: check.code });
  }

  // A code the caller already owns is "available" to them: re-promoting a
  // previous code is how you switch back to it.
  const ownedByCaller = owner.user_id === authData.user.id;

  return ownedByCaller
    ? NextResponse.json({ available: true, code: check.code, mine: true })
    : NextResponse.json({ available: false, reason: "That code is already taken." });
}
