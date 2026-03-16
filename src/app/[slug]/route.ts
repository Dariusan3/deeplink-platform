import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RedirectRule } from "@/types/links";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = (supabaseUrl && !supabaseUrl.includes("your-supabase-url-here"))
  ? createClient(supabaseUrl, supabaseAnonKey)
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
  }
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: link, error } = await supabase
    .from("links")
    .select("id, destination_url, redirect_rules, is_active")
    .eq("slug", slug)
    .single();

  if (error || !link) return NextResponse.redirect(new URL("/not-found", request.url), { status: 302 });
  if (!link.is_active) return NextResponse.redirect(new URL("/paused", request.url), { status: 302 });

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
