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

  // Get all links for the team (cheap — just ids — for the empty + 404 checks)
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
  if (linkId && !linkIds.includes(linkId)) {
    return Response.json({ error: "Link not found" }, { status: 404 });
  }

  // One server-side aggregation call (GROUP BY in Postgres) instead of
  // pulling every raw click row + a separate all-time count query.
  const { data: agg, error } = await supabase.rpc("api_team_stats", {
    p_team_id: auth.teamId,
    p_days: days,
    p_link_id: linkId ?? null,
  });

  if (error) {
    console.error("[v1/stats] error:", error.message);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }

  const stats = (agg ?? {}) as {
    total_clicks?: number;
    clicks_in_period?: number;
    daily_counts?: { date: string; count: number }[];
    top_countries?: { country: string; count: number }[];
    top_devices?: { device: string; count: number }[];
    top_referrers?: { referrer: string; count: number }[];
  };

  return Response.json({
    data: {
      total_clicks: stats.total_clicks ?? 0,
      clicks_in_period: stats.clicks_in_period ?? 0,
      period_days: days,
      daily_counts: stats.daily_counts ?? [],
      top_countries: stats.top_countries ?? [],
      top_devices: stats.top_devices ?? [],
      top_referrers: stats.top_referrers ?? [],
    },
  });
}
