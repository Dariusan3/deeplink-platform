import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// POST /api/v1/ab-tests — Track conversion event
export async function POST(request: NextRequest) {
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
        .select("id")
        .eq("slug", slug)
        .limit(1)
        .maybeSingle();
      if (!test) {
        return NextResponse.json({ error: "A/B test not found" }, { status: 404 });
      }
      testId = test.id;
    }

    if (!testId) {
      return NextResponse.json({ error: "test_id or slug is required" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const userAgent = request.headers.get("user-agent") || "";

    // Insert conversion event
    const { error: eventError } = await supabase.from("ab_test_events").insert({
      test_id: testId,
      variant,
      event_type: "conversion",
      revenue: revenue || 0,
      ip_address: ip,
      user_agent: userAgent,
    });

    if (eventError) {
      return NextResponse.json({ error: "Failed to track conversion" }, { status: 500 });
    }

    // Increment conversion counter and revenue on the test
    const convCol = variant === "a" ? "variant_a_conversions" : "variant_b_conversions";
    const revCol = variant === "a" ? "variant_a_revenue" : "variant_b_revenue";

    // Fetch current values
    const { data: test } = await supabase
      .from("ab_tests")
      .select("variant_a_conversions, variant_b_conversions, variant_a_revenue, variant_b_revenue")
      .eq("id", testId)
      .single();

    if (test) {
      const currentConv = variant === "a" ? test.variant_a_conversions : test.variant_b_conversions;
      const currentRev = variant === "a" ? test.variant_a_revenue : test.variant_b_revenue;

      await supabase.from("ab_tests").update({
        [convCol]: currentConv + 1,
        [revCol]: currentRev + (revenue || 0),
      }).eq("id", testId);
    }

    return NextResponse.json({ success: true, event: "conversion", variant });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
