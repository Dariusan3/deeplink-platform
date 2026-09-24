import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePartnerByCode } from "@/lib/partner-codes";

// POST /api/auth/referral-signup { email, password, full_name, code }
//
// Signup for people arriving through a partner link, WITHOUT the confirmation
// email. Supabase's "confirm email" is a project-wide switch, so the browser's
// supabase.auth.signUp can't skip it for just these users. Instead the account
// is created here with the admin API and email_confirm: true, and only when the
// referral code resolves to a real partner — anyone without a valid code still
// goes through the normal signUp + confirmation path.
//
// The code rides in user_metadata.referral_code, so the handle_new_user trigger
// (migration 029) lands the account on signup_status 'ok'. The client then signs
// in with the same password and claims the referral as usual.
//
// Trade-off: the email is not proven to belong to the person typing it. The
// worst case is someone registering another person's address; the real owner
// then can't sign up with it, but nothing is exposed (no session is issued for
// an address the caller doesn't hold the password to). Rate limited per IP.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 5;

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

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const body = await request.json().catch(() => ({}));
  const { email, password, full_name, code } = body as {
    email?: string;
    password?: string;
    full_name?: string;
    code?: string;
  };

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Referral code required" }, { status: 400 });
  }

  const partner = await resolvePartnerByCode(admin, code);
  if (!partner) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: (full_name || "").trim(), referral_code: code },
  });
  if (error) {
    const exists = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      { error: exists ? "An account with this email already exists. Try signing in." : error.message },
      { status: exists ? 409 : 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
