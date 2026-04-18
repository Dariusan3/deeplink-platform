import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RedirectRule } from "@/types/links";
import { finalizeABWinnerIfReady } from "@/lib/ab-testing";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = (supabaseUrl && !supabaseUrl.includes("your-supabase-url-here"))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Service-role client is used to update ab_tests + read team/user for the
// winner email — anon key RLS would block the team_members/users lookup.
const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

function ensureAbsoluteUrl(url: string): string {
  if (!url) return "";
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  return `https://${trimmedUrl}`;
}

function evaluateConditions(
  rule: RedirectRule,
  context: { country?: string; deviceType: string; now: Date }
): boolean {
  const { conditions } = rule;
  if (conditions.geo?.countries && conditions.geo.countries.length > 0) {
    if (!context.country || !conditions.geo.countries.includes(context.country.toUpperCase())) {
      return false;
    }
  }
  if (conditions.device?.types && conditions.device.types.length > 0) {
    if (!conditions.device.types.includes(context.deviceType as "mobile" | "tablet" | "desktop")) {
      return false;
    }
  }
  if (conditions.time) {
    const now = context.now;
    if (conditions.time.after && now < new Date(conditions.time.after)) return false;
    if (conditions.time.before && now > new Date(conditions.time.before)) return false;
    if (conditions.time.daysOfWeek && conditions.time.daysOfWeek.length > 0) {
      if (!conditions.time.daysOfWeek.includes(now.getDay())) return false;
    }
    if (conditions.time.hourStart !== undefined && conditions.time.hourEnd !== undefined) {
      const hour = now.getHours();
      if (conditions.time.hourStart <= conditions.time.hourEnd) {
        if (hour < conditions.time.hourStart || hour >= conditions.time.hourEnd) return false;
      } else {
        // Overnight range (e.g. 22 → 6)
        if (hour < conditions.time.hourStart && hour >= conditions.time.hourEnd) return false;
      }
    }
  }
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  // Check rotator collections first
  const { data: rotatorCollection } = await supabase
    .from("collections")
    .select("id")
    .eq("rotator_slug", slug)
    .eq("is_rotator", true)
    .limit(1)
    .maybeSingle();

  if (rotatorCollection) {
    // Get all active links in this collection
    const { data: rotatorLinks } = await supabase
      .from("links")
      .select("id, destination_url, slug")
      .eq("collection_id", rotatorCollection.id)
      .eq("is_active", true);

    if (rotatorLinks && rotatorLinks.length > 0) {
      // Random pick
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      const picked = rotatorLinks[randomBytes[0] % rotatorLinks.length];
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

      // Track click on the picked link
      supabase.from("link_clicks").insert({
        link_id: picked.id,
        ip_address: ip,
        user_agent: request.headers.get("user-agent"),
        country: request.headers.get("x-vercel-ip-country") || null,
        device_type: detectDeviceType(request.headers.get("user-agent") || ""),
      }).then(() => {});

      return NextResponse.redirect(ensureAbsoluteUrl(picked.destination_url), { status: 302 });
    }

    return NextResponse.redirect(new URL("/not-found", request.url), { status: 302 });
  }

  // Check A/B tests
  const { data: abTest } = await supabase
    .from("ab_tests")
    .select("*")
    .eq("slug", slug)
    .in("status", ["running", "completed"])
    .limit(1)
    .maybeSingle();

  if (abTest) {
    return handleABTest(request, abTest);
  }

  const { data: link, error } = await supabase
    .from("links")
    .select("id, destination_url, redirect_rules, is_active, team_id")
    .eq("slug", slug)
    .single();

  if (error || !link) return NextResponse.redirect(new URL("/not-found", request.url), { status: 302 });
  if (!link.is_active) return NextResponse.redirect(new URL("/paused", request.url), { status: 302 });

  // Detect TikTok in-app browser
  const userAgent = request.headers.get("user-agent") || "";
  const isTikTok = /TikTok|BytedanceWebview|musical_ly/i.test(userAgent);

  if (isTikTok && link.team_id) {
    const { data: teamSettings } = await supabase
      .from("team_settings")
      .select("tiktok_browser_mode")
      .eq("team_id", link.team_id)
      .single();

    if (teamSettings?.tiktok_browser_mode === "overlay") {
      // Show the "Open in browser" overlay page instead of redirecting
      const overlayUrl = new URL("/tiktok-open", request.url);
      overlayUrl.searchParams.set("url", ensureAbsoluteUrl(link.destination_url));
      return NextResponse.redirect(overlayUrl, { status: 302 });
    }
  }

  const isDev = process.env.NODE_ENV === "development";
  const url = new URL(request.url);
  
  const deviceQuery = isDev ? url.searchParams.get("device") : null;
  const deviceType = deviceQuery || detectDeviceType(request.headers.get("user-agent") || "");
  
  const countryHeader = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry");
  const country = (isDev && url.searchParams.get("country"))
    ? url.searchParams.get("country")?.toUpperCase()
    : countryHeader;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = new Date();

  let destinationUrl = link.destination_url;
  let matchedRuleIndex = -1;
  const rules = (link.redirect_rules as any) || [];
  const sortedRules = [...rules].sort((a: any, b: any) => (a.priority || 0) - (b.priority || 0));

  for (let i = 0; i < sortedRules.length; i++) {
    if (evaluateConditions(sortedRules[i], { country: country || undefined, deviceType, now })) {
      destinationUrl = sortedRules[i].destination_url;
      matchedRuleIndex = i;
      break;
    }
  }

  const finalDestination = ensureAbsoluteUrl(destinationUrl);
  if (supabase && link) {
    supabase.from("link_clicks").insert({
      link_id: link.id,
      ip_address: ip,
      user_agent: request.headers.get("user-agent"),
      country: country || null,
      device_type: deviceType,
      matched_rule_index: matchedRuleIndex,
    }).then(() => {});
  }

  return NextResponse.redirect(finalDestination, { status: 302 });
}

// A/B Test redirect handler
async function handleABTest(request: NextRequest, test: any) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "";
  const country = request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null;
  const deviceType = detectDeviceType(userAgent);

  let variant: "a" | "b";
  let destinationUrl: string;

  // If winner already selected, redirect 100% to winner
  if (test.winner) {
    variant = test.winner as "a" | "b";
    destinationUrl = variant === "a" ? test.variant_a_url : test.variant_b_url;
  } else {
    // Fair 50/50 split using crypto random
    const randomBytes = new Uint8Array(1);
    crypto.getRandomValues(randomBytes);
    variant = randomBytes[0] < 128 ? "a" : "b";
    destinationUrl = variant === "a" ? test.variant_a_url : test.variant_b_url;

    // Auto-optimization — kicked off async so it doesn't block the redirect.
    // Uses service-role client so it can read team_members/users for the
    // winner email (anon RLS would block that lookup).
    if (test.auto_optimize && supabaseAdmin) {
      finalizeABWinnerIfReady(supabaseAdmin, test).catch((err) => {
        console.error("A/B winner finalization failed:", err);
      });
    }
  }

  // Track visit event and atomically increment counter
  supabase!.from("ab_test_events").insert({
    test_id: test.id,
    variant,
    event_type: "visit",
    ip_address: ip,
    user_agent: userAgent,
    country,
    device_type: deviceType,
  }).then(() => {});

  supabase!.rpc("increment_ab_visit", {
    p_test_id: test.id,
    p_variant: variant,
  }).then(() => {});

  return NextResponse.redirect(ensureAbsoluteUrl(destinationUrl), { status: 302 });
}
