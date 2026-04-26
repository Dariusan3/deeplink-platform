import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Returns funnel + geo + device breakdown for the calling partner.
// Uses service-role client so we can hit partner_referral_clicks
// without the RLS round-trip (we still gate by user_id ourselves).
export async function GET() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  const { data: profile } = await admin
    .from("partner_profiles")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "not a partner" }, { status: 403 });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [{ data: clicks }, { data: refs }] = await Promise.all([
    admin
      .from("partner_referral_clicks")
      .select("country, device, converted, clicked_at")
      .eq("partner_id", profile.id)
      .gte("clicked_at", fourteenDaysAgo.toISOString()),
    admin
      .from("partner_referrals")
      .select("status")
      .eq("partner_id", profile.id),
  ]);

  const totalClicks = clicks?.length ?? 0;
  const totalSignups = refs?.length ?? 0;
  const totalConversions = (refs ?? []).filter((r) => r.status === "active").length;
  const conversionRate = totalClicks > 0 ? totalConversions / totalClicks : 0;

  // Bucket clicks by day
  const byDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
  }
  for (const c of clicks ?? []) {
    const key = (c.clicked_at as string).slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  // Top countries / devices
  const countByKey = (rows: { country?: string | null; device?: string | null }[], key: "country" | "device") => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = (r[key] ?? "Unknown") || "Unknown";
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, count]) => ({ [key]: k, count }));
  };

  return NextResponse.json({
    totalClicks,
    totalSignups,
    totalConversions,
    conversionRate,
    clicksByDay: [...byDay.entries()].map(([date, count]) => ({ date, count })),
    countries: countByKey(clicks ?? [], "country"),
    devices: countByKey(clicks ?? [], "device"),
  });
}
