import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazily created on first request, not at module scope: `next build` loads
// this module to collect page data and an eager top-level client throws
// "supabaseKey is required" when no key is present at build time.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    _supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
  }
  return _supabase;
}

// Simple in-memory rate limiter: max 30 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) return true;
  return false;
}

// Periodically clean stale entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW);

// POST /api/v1/ab-tests — Track conversion event
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 requests per minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { test_id, slug, variant, revenue } = body;

    if (!variant || !["a", "b"].includes(variant)) {
      return NextResponse.json({ error: "Invalid variant. Must be 'a' or 'b'" }, { status: 400 });
    }

    // Look up test by ID or slug
    let testId = test_id;
    if (!testId && slug) {
      const { data: test } = await supabase
        .from("ab_tests")
        .select("id, status")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      if (!test) {
        return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
      }
      if (test.status !== "running") {
        return NextResponse.json({ error: "A/B test is not running" }, { status: 400 });
      }
      testId = test.id;
    }

    if (!testId) {
      return NextResponse.json({ error: "test_id or slug is required" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") || "";
    const safeRevenue = Math.max(0, parseFloat(revenue) || 0);

    // Insert conversion event
    const { error: eventError } = await supabase.from("ab_test_events").insert({
      test_id: testId,
      variant,
      event_type: "conversion",
      revenue: safeRevenue,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (eventError) {
      return NextResponse.json({ error: "Failed to track conversion" }, { status: 500 });
    }

    // Atomic increment — no race condition
    const { error: rpcError } = await supabase.rpc("increment_ab_conversion", {
      p_test_id: testId,
      p_variant: variant,
      p_revenue: safeRevenue,
    });

    if (rpcError) {
      console.error("increment_ab_conversion error:", rpcError.message);
    }

    return NextResponse.json({ success: true, event: "conversion", variant });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
