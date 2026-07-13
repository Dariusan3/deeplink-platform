// Live metrics shown on /dashboard/alerts so users can see the underlying
// numbers behind each detector — not just the alerts that fired. Everything
// is computed in one function so the page makes a single round-trip.
//
// Read-only: no writes, safe to call as often as the user reloads.

import type { SupabaseClient } from "@supabase/supabase-js";
import { planClickCap } from "./alerts";

export type AlertMetrics = {
  // ── Plan / volume ─────────────────────────────────
  plan: string;
  // null on an uncapped plan (Agency). It USED to be `number`, holding the
  // Infinity that planClickCap returns — but this struct is shipped over the
  // wire, and JSON.stringify(Infinity) is `null`. So the type promised a number
  // the client never got, and `planCap.toLocaleString()` threw for every Agency
  // customer who opened the page. Say null and mean it.
  planCap: number | null;
  clicksThisMonth: number;
  monthPct: number;
  clicksToday: number;
  clicksAvg7d: number;       // avg per day over the prior 7 full days
  todayVsAvgPct: number;     // signed: -50 means -50% vs avg
  clicksLastHour: number;
  hourAvg24h: number;        // avg per hour over the prior 23 hours
  spikeRatio: number;        // last-hour / hour-avg, 1.0 = normal

  // ── Inventory / health ────────────────────────────
  linksTotal: number;
  linksActive: number;
  linksStale: number;        // active, zero clicks in 30d (sampled up to 100)
  brokenDestinations: number;// from HEAD probes done at metrics time
  brokenSamples: { slug: string; status: number }[];

  // ── Audience split (last 7d vs 8-30d) ─────────────
  topCountryNow: string | null;
  topCountryNowShare: number;
  topCountryBefore: string | null;
  mobileShareNow: number;
  mobileShareBefore: number;
  peakHourNow: number | null;
  peakHourBefore: number | null;

  // ── A/B testing ──────────────────────────────────
  abRunning: number;
  abRecentWinners: number;    // in last 24h

  // ── Suspicious patterns ───────────────────────────
  topIpLastHour: { ip: string; count: number } | null;

  // ── Billing ───────────────────────────────────────
  subStatus: "active" | "trial" | "cancelled" | "expired" | "none";
  subPlan: string | null;
  subDaysLeft: number | null;

  computedAt: string;
};

function startOfDay(d = new Date()): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}

async function teamLinkIds(supabase: SupabaseClient, teamId: string): Promise<string[]> {
  const { data } = await supabase
    .from("links")
    .select("id")
    .eq("team_id", teamId);
  return (data ?? []).map((l) => l.id);
}

async function countClicks(
  supabase: SupabaseClient,
  linkIds: string[],
  fromIso: string,
  toIso?: string
): Promise<number> {
  if (linkIds.length === 0) return 0;
  let q = supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds)
    .gte("clicked_at", fromIso);
  if (toIso) q = q.lt("clicked_at", toIso);
  const { count } = await q;
  return count ?? 0;
}

async function probeDestinations(
  supabase: SupabaseClient,
  teamId: string
): Promise<{ broken: number; samples: { slug: string; status: number }[] }> {
  // Cap HEAD probes — keeps the metrics call fast even for big accounts.
  const { data: links } = await supabase
    .from("links")
    .select("slug, destination_url")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .limit(15);
  if (!links || links.length === 0) return { broken: 0, samples: [] };

  const samples: { slug: string; status: number }[] = [];
  await Promise.all(
    links.map(async (l) => {
      if (!l.destination_url) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(l.destination_url, {
          method: "HEAD",
          redirect: "follow",
          signal: ctrl.signal,
        }).catch(() => null);
        clearTimeout(t);
        if (!res) return;
        if (res.status >= 400) samples.push({ slug: l.slug, status: res.status });
      } catch { /* swallow */ }
    })
  );
  return { broken: samples.length, samples: samples.slice(0, 3) };
}

export async function computeAlertMetrics(
  supabase: SupabaseClient,
  team: { id: string; plan: string | null }
): Promise<AlertMetrics> {
  const plan = team.plan ?? "free";
  const planCap = planClickCap(plan);

  const today = startOfDay();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86_400_000);
  const monthStart = (() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; })();
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);

  const linkIds = await teamLinkIds(supabase, team.id);

  // Parallelise the cheap counts.
  const [
    clicksThisMonth,
    clicksToday,
    clicksWeek,                // last full 7 days before today
    clicksLastHour,
    clicksLast24m1,            // 24h-ago → 1h-ago (the 23 prior hours)
  ] = await Promise.all([
    countClicks(supabase, linkIds, monthStart.toISOString()),
    countClicks(supabase, linkIds, today.toISOString()),
    countClicks(supabase, linkIds, sevenDaysAgo.toISOString(), today.toISOString()),
    countClicks(supabase, linkIds, hourAgo.toISOString()),
    countClicks(supabase, linkIds, dayAgo.toISOString(), hourAgo.toISOString()),
  ]);

  const clicksAvg7d = clicksWeek / 7;
  const hourAvg24h = clicksLast24m1 / 23;
  const todayVsAvgPct = clicksAvg7d > 0
    ? Math.round(((clicksToday - clicksAvg7d) / clicksAvg7d) * 100)
    : 0;
  const spikeRatio = hourAvg24h > 0 ? clicksLastHour / hourAvg24h : 0;

  // ── Inventory ─────────────────────────────────────────────────
  const { data: linkRows } = await supabase
    .from("links")
    .select("id, is_active")
    .eq("team_id", team.id);
  const linksTotal = linkRows?.length ?? 0;
  const linksActive = linkRows?.filter((l) => l.is_active).length ?? 0;

  let linksStale = 0;
  const activeIds = (linkRows ?? []).filter((l) => l.is_active).map((l) => l.id).slice(0, 100);
  if (activeIds.length > 0) {
    await Promise.all(activeIds.map(async (id) => {
      const { count } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", id)
        .gte("clicked_at", thirtyDaysAgo.toISOString());
      if ((count ?? 0) === 0) linksStale++;
    }));
  }

  const { broken: brokenDestinations, samples: brokenSamples } = await probeDestinations(supabase, team.id);

  // ── Audience split (last 7d vs 8–30d) ─────────────────────────
  const [recentClicks, historicClicks] = await Promise.all([
    linkIds.length === 0 ? Promise.resolve({ data: [] as { country: string | null; device_type: string | null; clicked_at: string }[] }) :
      supabase
        .from("link_clicks")
        .select("country, device_type, clicked_at")
        .in("link_id", linkIds)
        .gte("clicked_at", sevenDaysAgo.toISOString()),
    linkIds.length === 0 ? Promise.resolve({ data: [] as { country: string | null; device_type: string | null; clicked_at: string }[] }) :
      supabase
        .from("link_clicks")
        .select("country, device_type, clicked_at")
        .in("link_id", linkIds)
        .gte("clicked_at", thirtyDaysAgo.toISOString())
        .lt("clicked_at", sevenDaysAgo.toISOString()),
  ]);

  const recent = (recentClicks.data ?? []) as { country: string | null; device_type: string | null; clicked_at: string }[];
  const historic = (historicClicks.data ?? []) as { country: string | null; device_type: string | null; clicked_at: string }[];

  const tallyCountry = (rows: { country: string | null }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.country) m.set(r.country, (m.get(r.country) ?? 0) + 1);
    return m;
  };
  const topOf = (m: Map<string, number>) => {
    let best: [string, number] = ["", 0];
    for (const [k, v] of m.entries()) if (v > best[1]) best = [k, v];
    return best[1] === 0 ? null : best;
  };

  const recentCountries = tallyCountry(recent);
  const historicCountries = tallyCountry(historic);
  const topRecent = topOf(recentCountries);
  const topHistoric = topOf(historicCountries);
  const topCountryNow = topRecent?.[0] ?? null;
  const topCountryNowShare = topRecent && recent.length > 0 ? topRecent[1] / recent.length : 0;
  const topCountryBefore = topHistoric?.[0] ?? null;

  const mobileShare = (rows: { device_type: string | null }[]) => {
    let mob = 0, tot = 0;
    for (const r of rows) {
      if (!r.device_type) continue;
      tot++;
      if (r.device_type === "mobile" || r.device_type === "tablet") mob++;
    }
    return tot > 0 ? mob / tot : 0;
  };
  const mobileShareNow = mobileShare(recent);
  const mobileShareBefore = mobileShare(historic);

  const peakHour = (rows: { clicked_at: string }[]): number | null => {
    if (rows.length === 0) return null;
    const buckets = new Array(24).fill(0);
    for (const r of rows) buckets[new Date(r.clicked_at).getHours()]++;
    let best = -1, bestIdx = 0;
    buckets.forEach((c, i) => { if (c > best) { best = c; bestIdx = i; } });
    return bestIdx;
  };
  const peakHourNow = peakHour(recent);
  const peakHourBefore = peakHour(historic);

  // ── A/B testing ──────────────────────────────────────────────
  const [abRunningRow, abWinnersRow] = await Promise.all([
    supabase.from("ab_tests").select("*", { count: "exact", head: true })
      .eq("team_id", team.id).eq("status", "running"),
    supabase.from("ab_tests").select("*", { count: "exact", head: true })
      .eq("team_id", team.id).not("winner", "is", null)
      .gte("winner_selected_at", dayAgo.toISOString()),
  ]);

  // ── Top IP last hour ─────────────────────────────────────────
  let topIpLastHour: { ip: string; count: number } | null = null;
  if (linkIds.length > 0) {
    const { data: lh } = await supabase
      .from("link_clicks")
      .select("ip_address")
      .in("link_id", linkIds)
      .gte("clicked_at", hourAgo.toISOString());
    const byIp = new Map<string, number>();
    for (const c of lh ?? []) {
      const ip = String(c.ip_address ?? "");
      if (!ip || ip === "unknown") continue;
      byIp.set(ip, (byIp.get(ip) ?? 0) + 1);
    }
    for (const [ip, n] of byIp.entries()) {
      if (!topIpLastHour || n > topIpLastHour.count) topIpLastHour = { ip, count: n };
    }
  }

  // ── Subscription ────────────────────────────────────────────
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, expires_at")
    .eq("team_id", team.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subStatus = (sub?.status as AlertMetrics["subStatus"]) ?? "none";
  const subPlan = sub?.plan ?? null;
  const subDaysLeft = sub?.expires_at
    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  const capped = Number.isFinite(planCap);

  return {
    plan,
    planCap: capped ? planCap : null,
    clicksThisMonth,
    // An uncapped plan has no percentage. `used / Infinity` is 0, which would
    // have rendered a paying Agency customer a permanent, meaningless 0%.
    monthPct: capped && planCap > 0 ? Math.round((clicksThisMonth / planCap) * 100) : 0,
    clicksToday,
    clicksAvg7d,
    todayVsAvgPct,
    clicksLastHour,
    hourAvg24h,
    spikeRatio,

    linksTotal,
    linksActive,
    linksStale,
    brokenDestinations,
    brokenSamples,

    topCountryNow,
    topCountryNowShare,
    topCountryBefore,
    mobileShareNow,
    mobileShareBefore,
    peakHourNow,
    peakHourBefore,

    abRunning: abRunningRow.count ?? 0,
    abRecentWinners: abWinnersRow.count ?? 0,

    topIpLastHour,

    subStatus,
    subPlan,
    subDaysLeft,

    computedAt: new Date().toISOString(),
  };
}
