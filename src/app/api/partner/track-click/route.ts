import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint: logs a click on a partner referral code. No auth.
// Called by the landing page client effect when ?ref= is present.
//
// Rate-limited per IP to deter abuse (3000 RPS bot would otherwise inflate
// click counts). Uses the same in-memory pattern as other public endpoints.

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

function detectDevice(ua: string): string {
  const u = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(u)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/.test(u)) return "mobile";
  return "desktop";
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { code?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const code = (body.code || "").trim();
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ ok: false }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: partner } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!partner) {
    // Silently succeed so we don't leak which codes are valid.
    return NextResponse.json({ ok: true });
  }

  const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null;
  const device = detectDevice(request.headers.get("user-agent") || "");

  await supabase.from("partner_referral_clicks").insert({
    partner_id: partner.id,
    country,
    device,
  });

  return NextResponse.json({ ok: true });
}
