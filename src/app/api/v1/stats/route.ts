import { createClient } from "@/lib/supabase/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { NextRequest } from "next/server";

// GET /api/v1/stats — Get click statistics for the team
export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (auth instanceof Response) return auth;

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90);
  const linkId = searchParams.get("link_id");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get all links for the team
  const { data: links } = await supabase
    .from("links")
    .select("id")
    .eq("team_id", auth.teamId);

  const linkIds = links?.map((l) => l.id) || [];

  if (linkIds.length === 0) {
    return Response.json({
      data: {
        total_clicks: 0,
        clicks_in_period: 0,
        daily_counts: [],
        top_countries: [],
        top_devices: [],
        top_referrers: [],
      },
    });
  }

  // If a specific link_id is requested, validate it belongs to the team
  const targetIds = linkId ? [linkId].filter((id) => linkIds.includes(id)) : linkIds;

  if (linkId && targetIds.length === 0) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  // Fetch clicks in the period
  const { data: clicks, error } = await supabase
    .from("link_clicks")
    .select("clicked_at, country, device_type, referer")
    .in("link_id", targetIds)
    .gte("clicked_at", since.toISOString())
    .order("clicked_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const allClicks = clicks || [];

  // Aggregate daily counts
  const dailyMap = new Map<string, number>();
  for (const click of allClicks) {
    const day = click.clicked_at.split("T")[0];
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
  }
  const dailyCounts = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Aggregate countries
  const countryMap = new Map<string, number>();
  for (const click of allClicks) {
    const country = click.country || "Unknown";
    countryMap.set(country, (countryMap.get(country) || 0) + 1);
  }
  const topCountries = Array.from(countryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  // Aggregate devices
  const deviceMap = new Map<string, number>();
  for (const click of allClicks) {
    const device = click.device_type || "unknown";
    deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
  }
  const topDevices = Array.from(deviceMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  // Aggregate referrers
  const referrerMap = new Map<string, number>();
  for (const click of allClicks) {
    let referrer = "Direct";
    if (click.referer) {
      try {
        referrer = new URL(click.referer).hostname;
      } catch {
        referrer = click.referer;
      }
    }
    referrerMap.set(referrer, (referrerMap.get(referrer) || 0) + 1);
  }
  const topReferrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  // Total clicks (all time)
  const { count: totalClicks } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", targetIds);

  return Response.json({
    data: {
      total_clicks: totalClicks || 0,
      clicks_in_period: allClicks.length,
      period_days: days,
      daily_counts: dailyCounts,
      top_countries: topCountries,
      top_devices: topDevices,
      top_referrers: topReferrers,
    },
  });
}
