import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { RedirectRule } from "@/types/links";
import { finalizeABWinnerIfReady } from "@/lib/ab-testing";
import { getAppDeepLink } from "@/lib/deeplink";
import { resolveSlug } from "@/lib/link-cache";

// Interstitial that opens the native app on a phone, then falls back to
// the web URL if the app isn't installed. A plain 302 to https does NOT
// reliably trigger iOS Universal Links / Android App Links, so we render
// a tiny page that tries the app scheme first and bounces to the web
// after a short timeout.
function deepLinkInterstitial(opts: {
  iosUri: string;
  androidUri: string;
  webUrl: string;
  appName: string;
}): string {
  const { iosUri, androidUri, webUrl, appName } = opts;
  const j = (s: string) => JSON.stringify(s);
  return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Opening ${appName}…</title>
<style>
  html,body{height:100%;margin:0;background:#0a0a0a;color:#fff;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
  .c{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px;}
  .spin{width:34px;height:34px;border:3px solid rgba(0,210,106,.25);border-top-color:#00D26A;border-radius:50%;animation:s 1s linear infinite;}
  @keyframes s{to{transform:rotate(360deg)}}
  p{font-size:14px;color:#a3a3a3;margin:0;}
  a{color:#00D26A;font-weight:700;text-decoration:none;font-size:13px;}
</style></head>
<body><div class="c">
  <div class="spin"></div>
  <p>Opening ${appName}…</p>
  <a id="fallback" href=${j(webUrl)}>Continue in browser →</a>
</div>
<script>
  (function(){
    var ios = ${j(iosUri)}, android = ${j(androidUri)}, web = ${j(webUrl)};
    var ua = navigator.userAgent || "";
    var isAndroid = /android/i.test(ua);
    var target = isAndroid ? android : ios;
    var didHide = false;
    // If the app opens, the page is backgrounded — cancel the web fallback.
    document.addEventListener("visibilitychange", function(){
      if (document.hidden) didHide = true;
    });
    // Try the app.
    window.location.href = target;
    // Fallback to the web URL if still here (app not installed).
    setTimeout(function(){ if(!didHide) window.location.replace(web); }, 1500);
  })();
</script>
</body></html>`;
}

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

  // Resolve the slug across its three possible namespaces (rotator collection,
  // A/B test, plain link). This lookup is cached server-side — see
  // lib/link-cache.ts for the TTL and invalidation story. Match priority is
  // unchanged: rotator > A/B test > plain link.
  //
  // Only the *lookup* is cached. Everything below that depends on this request
  // — the rotator's random pick, the A/B split, geo/device rule evaluation, and
  // click tracking — still runs fresh on every hit.
  const resolution = await resolveSlug(slug);

  // Rotator collection takes precedence.
  if (resolution.rotator) {
    const rotatorLinks = resolution.rotator.links;

    if (rotatorLinks.length > 0) {
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

  // Then A/B test.
  if (resolution.abTest) {
    return handleABTest(request, resolution.abTest);
  }

  const link = resolution.link;
  if (!link) return NextResponse.redirect(new URL("/not-found", request.url), { status: 302 });

  // Detect TikTok in-app browser up front so we know whether team display
  // preferences are even relevant.
  const userAgent = request.headers.get("user-agent") || "";
  const isTikTok = /TikTok|BytedanceWebview|musical_ly/i.test(userAgent);

  // Team display preferences (paused-page branding + TikTok overlay mode)
  // are only consulted on those two branches. The overwhelming common case
  // — an active link in a normal browser — never reads them, so we skip the
  // round-trip entirely instead of fetching on every redirect.
  let tiktokMode: string | undefined;
  let showAppTap = true;
  let showBranding = true;
  if ((!link.is_active || isTikTok) && link.team_id) {
    const { data: teamSettings } = await supabase
      .from("team_settings")
      .select("tiktok_browser_mode, show_app_tap_to_continue, show_branding")
      .eq("team_id", link.team_id)
      .single();
    tiktokMode = teamSettings?.tiktok_browser_mode;
    if (teamSettings?.show_app_tap_to_continue === false) showAppTap = false;
    if (teamSettings?.show_branding === false) showBranding = false;
  }

  if (!link.is_active) {
    const pausedUrl = new URL("/paused", request.url);
    if (!showBranding) pausedUrl.searchParams.set("branding", "0");
    return NextResponse.redirect(pausedUrl, { status: 302 });
  }

  if (isTikTok && tiktokMode === "overlay") {
    const overlayUrl = new URL("/tiktok-open", request.url);
    overlayUrl.searchParams.set("url", ensureAbsoluteUrl(link.destination_url));
    if (!showAppTap) overlayUrl.searchParams.set("tap", "0");
    if (!showBranding) overlayUrl.searchParams.set("branding", "0");
    return NextResponse.redirect(overlayUrl, { status: 302 });
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

  // Deep linking: on a phone, if the destination is a known app
  // (YouTube, Instagram, TikTok, …) serve an interstitial that opens the
  // native app and falls back to the web. Desktop or unknown hosts get a
  // normal 302. `device=desktop` in dev skips this.
  const isMobile = deviceType === "mobile" || deviceType === "tablet";
  if (isMobile) {
    const app = getAppDeepLink(finalDestination);
    if (app) {
      const html = deepLinkInterstitial({
        iosUri: app.ios,
        androidUri: app.android,
        webUrl: finalDestination,
        appName: app.app,
      });
      return new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
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
