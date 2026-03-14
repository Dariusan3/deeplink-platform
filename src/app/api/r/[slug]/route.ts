import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RedirectRule } from "@/types/database";

// Use service-level client for redirect lookups (no auth needed)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

function evaluateConditions(
  rule: RedirectRule,
  context: { country?: string; deviceType: string; now: Date }
): boolean {
  const { conditions } = rule;

  // Check geo condition
  if (conditions.geo?.countries && conditions.geo.countries.length > 0) {
    if (!context.country || !conditions.geo.countries.includes(context.country.toUpperCase())) {
      return false;
    }
  }

  // Check device condition
  if (conditions.device?.types && conditions.device.types.length > 0) {
    if (!conditions.device.types.includes(context.deviceType as "mobile" | "tablet" | "desktop")) {
      return false;
    }
  }

  // Check time condition
  if (conditions.time) {
    const now = context.now;
    if (conditions.time.after && now < new Date(conditions.time.after)) {
      return false;
    }
    if (conditions.time.before && now > new Date(conditions.time.before)) {
      return false;
    }
    if (conditions.time.daysOfWeek && conditions.time.daysOfWeek.length > 0) {
      if (!conditions.time.daysOfWeek.includes(now.getDay())) {
        return false;
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

  // Look up the link
  const { data: link, error } = await supabase
    .from("links")
    .select("id, destination_url, redirect_rules, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !link) {
    return NextResponse.json(
      { error: "Link not found" },
      { status: 404 }
    );
  }

  // Extract context from request
  const userAgent = request.headers.get("user-agent") || "";
  const deviceType = detectDeviceType(userAgent);
  const country =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    undefined;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const referer = request.headers.get("referer") || undefined;
  const now = new Date();

  // Evaluate redirect rules
  let destinationUrl = link.destination_url;
  let matchedRuleIndex = -1;

  const rules: RedirectRule[] = link.redirect_rules || [];
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sortedRules.length; i++) {
    if (evaluateConditions(sortedRules[i], { country, deviceType, now })) {
      destinationUrl = sortedRules[i].destination_url;
      matchedRuleIndex = i;
      break;
    }
  }

  // Log click asynchronously (fire-and-forget)
  supabase
    .from("link_clicks")
    .insert({
      link_id: link.id,
      ip_address: ip,
      user_agent: userAgent,
      country: country || null,
      device_type: deviceType,
      referer: referer || null,
      matched_rule_index: matchedRuleIndex,
    })
    .then(() => {
      // Click logged successfully
    });

  // 302 redirect
  return NextResponse.redirect(destinationUrl, { status: 302 });
}
