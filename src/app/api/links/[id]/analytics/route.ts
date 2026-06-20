import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";

// GET /api/links/:id/analytics
//
// Lightweight per-link analytics for the tree-view info panel. Returns
// totals + a 14-day sparkline + top country + device split + last click.
// Runs with the user's SSR session so RLS scopes link_clicks to the
// caller's team automatically — no service role needed.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSsr();

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // Verify the link exists + is visible to the caller (RLS handles the
  // team scoping). Also pulls the fields the panel header needs.
  const { data: link, error: linkErr } = await supabase
    .from("links")
    .select("id, slug, title, destination_url, is_active, created_at, click_goal, click_goal_period")
    .eq("id", id)
    .maybeSingle();

  if (linkErr || !link) {
    return NextResponse.json({ error: "link not found" }, { status: 404 });
  }

  const since = new Date(Date.now() - 13 * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);

  const { data: clicks } = await supabase
    .from("link_clicks")
    .select("clicked_at, country, city, device_type, referer")
    .eq("link_id", id)
    .gte("clicked_at", since.toISOString())
    .order("clicked_at", { ascending: false });

  const rows = (clicks ?? []) as {
    clicked_at: string;
    country: string | null;
    city: string | null;
    device_type: string | null;
    referer: string | null;
  }[];

  // 14-day daily counts (zero-filled).
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = r.clicked_at.slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const daily: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    daily.push({ date: d, count: byDay.get(d) ?? 0 });
  }

  // Country / device / referrer breakdowns over the window.
  const countryCount = new Map<string, number>();
  const deviceCount = new Map<string, number>();
  const refCount = new Map<string, number>();
  for (const r of rows) {
    if (r.country) countryCount.set(r.country, (countryCount.get(r.country) ?? 0) + 1);
    const dev = r.device_type || "unknown";
    deviceCount.set(dev, (deviceCount.get(dev) ?? 0) + 1);
    // Normalise referrer to a hostname; blank/null → "Direct".
    let ref = "Direct";
    if (r.referer) {
      try { ref = new URL(r.referer).hostname.replace(/^www\./, ""); }
      catch { ref = r.referer; }
    }
    refCount.set(ref, (refCount.get(ref) ?? 0) + 1);
  }
  const topCountry = [...countryCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const countries = [...countryCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));
  const devices = [...deviceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  const referrers = [...refCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // Total clicks all-time (separate count query — head only).
  const { count: totalClicks } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .eq("link_id", id);

  const last7 = daily.slice(7).reduce((s, d) => s + d.count, 0);
  const prev7 = daily.slice(0, 7).reduce((s, d) => s + d.count, 0);

  return NextResponse.json({
    link,
    totalClicks: totalClicks ?? 0,
    clicks14d: rows.length,
    last7,
    prev7,
    daily,
    topCountry,
    countries,
    devices,
    referrers,
    lastClickAt: rows[0]?.clicked_at ?? null,
  });
}
