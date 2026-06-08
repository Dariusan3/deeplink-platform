// All alert detectors live here as pure async functions of (supabase, team).
// They return DetectedAlert[] which the caller inserts into anomaly_alerts.
//
// The same set is consumed by:
//   * /api/cron/tier1-alerts      → runs on Vercel cron every 3 hours
//   * /api/alerts/check           → manual "Check now" from the UI
//
// Each detector is self-contained — if one throws, the rest still run.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type AlertType,
  type AlertSeverity,
  dedupKey,
  planClickCap,
} from "./alerts";

export type DetectedAlert = {
  team_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  affected_link: string | null;
  dedup_key: string;
  metadata: Record<string, unknown>;
};

// ─── Helpers ──────────────────────────────────────────────────────────

async function teamLinkIds(supabase: SupabaseClient, teamId: string): Promise<string[]> {
  const { data } = await supabase
    .from("links")
    .select("id")
    .eq("team_id", teamId);
  return (data ?? []).map((l) => l.id);
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ─── TIER 1 ──────────────────────────────────────────────────────────

export async function detectDestinationBroken(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const { data: links } = await supabase
    .from("links")
    .select("id, slug, destination_url, title")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .limit(25);
  if (!links || links.length === 0) return [];

  const out: DetectedAlert[] = [];
  await Promise.all(
    links.map(async (l) => {
      if (!l.destination_url) return;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(l.destination_url, {
          method: "HEAD",
          redirect: "follow",
          signal: ctrl.signal,
        }).catch(() => null);
        clearTimeout(t);
        if (!res) return;
        if (res.status >= 400) {
          out.push({
            team_id: teamId,
            alert_type: "destination_broken",
            severity: res.status >= 500 ? "high" : "medium",
            title: `Link "${l.title || l.slug}" destination returns ${res.status}`,
            description: `${l.destination_url} responded with HTTP ${res.status}. Visitors clicking your link are reaching a broken page. Fix the destination URL or replace it.`,
            affected_link: l.slug,
            dedup_key: dedupKey("destination_broken", { id: l.id }),
            metadata: { status: res.status, url: l.destination_url, link_id: l.id },
          });
        }
      } catch { /* swallow */ }
    })
  );
  return out;
}

export async function detectClickDrop(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const today = startOfDay();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86_400_000);

  // Pull links with slug + title so we can name the affected one in the
  // alert. Previously this detector was team-wide and only ever said
  // "Traffic is down X% today" without telling you WHICH link — useless
  // when you have a busy account with many destinations.
  const { data: links } = await supabase
    .from("links")
    .select("id, slug, title")
    .eq("team_id", teamId);
  if (!links || links.length === 0) return [];

  // Pull clicks for both windows in two queries (covers all team links),
  // then group per link in JS. Cheaper than firing 2N queries — and
  // link_clicks already has a composite (link_id, clicked_at) index.
  const linkIds = links.map((l) => l.id);
  const [todayRes, weekRes] = await Promise.all([
    supabase
      .from("link_clicks")
      .select("link_id")
      .in("link_id", linkIds)
      .gte("clicked_at", today.toISOString()),
    supabase
      .from("link_clicks")
      .select("link_id")
      .in("link_id", linkIds)
      .gte("clicked_at", sevenDaysAgo.toISOString())
      .lt("clicked_at", today.toISOString()),
  ]);

  const todayByLink = new Map<string, number>();
  for (const r of (todayRes.data ?? []) as { link_id: string }[]) {
    todayByLink.set(r.link_id, (todayByLink.get(r.link_id) ?? 0) + 1);
  }
  const weekByLink = new Map<string, number>();
  for (const r of (weekRes.data ?? []) as { link_id: string }[]) {
    weekByLink.set(r.link_id, (weekByLink.get(r.link_id) ?? 0) + 1);
  }

  // Thresholds tuned per-link (vs. team-wide): a link needs at least 10
  // clicks/day on average to be worth alerting on — quieter links would
  // flap from one slow day. Drop must be >=60% (today below 40% of avg).
  const MIN_AVG_PER_DAY = 10;
  const out: DetectedAlert[] = [];
  for (const link of links) {
    const todayCount = todayByLink.get(link.id) ?? 0;
    const weekCount  = weekByLink.get(link.id) ?? 0;
    const avg = weekCount / 7;
    if (avg < MIN_AVG_PER_DAY) continue;
    if (todayCount >= avg * 0.4) continue;

    const dropPct = Math.round(((avg - todayCount) / avg) * 100);
    const label = link.title || link.slug;
    out.push({
      team_id: teamId,
      alert_type: "click_drop",
      severity: dropPct >= 80 ? "high" : "medium",
      title: `Traffic on "${label}" is down ${dropPct}% today`,
      description: `"${label}" averaged ${Math.round(avg)} clicks/day this past week but only ${todayCount} so far today. Check if the destination broke, an ad set paused, or a traffic source got bannered.`,
      affected_link: link.slug,
      // dedup_key includes the link id so each link gets its own alert
      // row — without this, the second link's drop would silently
      // overwrite the first's.
      dedup_key: dedupKey("click_drop", { id: link.id }),
      metadata: { today: todayCount, avg7d: avg, drop_pct: dropPct, link_id: link.id, slug: link.slug },
    });
  }
  return out;
}

export async function detectClickSpam(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const oneHourAgo = new Date(Date.now() - 60 * 60_000);
  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { data: recent } = await supabase
    .from("link_clicks")
    .select("ip_address")
    .in("link_id", linkIds)
    .gte("clicked_at", oneHourAgo.toISOString());

  if (!recent || recent.length === 0) return [];

  const byIp = new Map<string, number>();
  for (const c of recent) {
    const ip = String(c.ip_address ?? "");
    if (!ip || ip === "unknown") continue;
    byIp.set(ip, (byIp.get(ip) ?? 0) + 1);
  }
  for (const [ip, n] of byIp.entries()) {
    if (n < 30) continue;
    return [{
      team_id: teamId,
      alert_type: "click_spam",
      severity: "high",
      title: `Suspicious burst: ${n} clicks from a single IP in the last hour`,
      description: `IP ${ip} hit your links ${n} times in 60 minutes. This usually means a bot scraper, click-fraud, or a misconfigured retry loop. Consider geo-blocking or contacting your ad platform.`,
      affected_link: null,
      dedup_key: dedupKey("click_spam", { id: ip }),
      metadata: { ip, count: n, window_min: 60 },
    }];
  }
  return [];
}

export async function detectPlanLimit(supabase: SupabaseClient, teamId: string, plan: string): Promise<DetectedAlert[]> {
  const cap = planClickCap(plan);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { count } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds)
    .gte("clicked_at", monthStart.toISOString());

  const used = count ?? 0;
  const pct = (used / cap) * 100;
  if (pct >= 100) {
    return [{
      team_id: teamId,
      alert_type: "plan_limit",
      severity: "high",
      title: `You've hit your monthly click limit on the ${plan} plan`,
      description: `${used.toLocaleString()} of ${cap.toLocaleString()} clicks used this month. New visitors will see the paused page until you upgrade or the cycle resets on the 1st.`,
      affected_link: null,
      dedup_key: dedupKey("plan_limit", { threshold: 100 }),
      metadata: { used, cap, pct: Math.round(pct), plan },
    }];
  }
  if (pct >= 80) {
    return [{
      team_id: teamId,
      alert_type: "plan_limit",
      severity: "medium",
      title: `You've used ${Math.round(pct)}% of your monthly click cap`,
      description: `${used.toLocaleString()} of ${cap.toLocaleString()} clicks this month on the ${plan} plan. At your current pace you'll hit the cap before the cycle resets — consider upgrading now.`,
      affected_link: null,
      dedup_key: dedupKey("plan_limit", { threshold: 80 }),
      metadata: { used, cap, pct: Math.round(pct), plan },
    }];
  }
  return [];
}

// ─── TIER 2 — Opportunities ───────────────────────────────────────────

export async function detectABWinner(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  // Tests that JUST had a winner picked but we haven't notified yet.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
  const { data: tests } = await supabase
    .from("ab_tests")
    .select("id, name, slug, winner, variant_a_name, variant_b_name, variant_a_visits, variant_a_conversions, variant_b_visits, variant_b_conversions, winner_selected_at")
    .eq("team_id", teamId)
    .not("winner", "is", null)
    .gte("winner_selected_at", dayAgo);

  if (!tests || tests.length === 0) return [];

  const out: DetectedAlert[] = [];
  for (const t of tests) {
    const winner = t.winner as "a" | "b";
    const wName = winner === "a" ? t.variant_a_name : t.variant_b_name;
    const lName = winner === "a" ? t.variant_b_name : t.variant_a_name;
    const wRate = winner === "a"
      ? t.variant_a_visits > 0 ? t.variant_a_conversions / t.variant_a_visits : 0
      : t.variant_b_visits > 0 ? t.variant_b_conversions / t.variant_b_visits : 0;
    const lRate = winner === "a"
      ? t.variant_b_visits > 0 ? t.variant_b_conversions / t.variant_b_visits : 0
      : t.variant_a_visits > 0 ? t.variant_a_conversions / t.variant_a_visits : 0;
    const lead = lRate > 0 ? Math.round(((wRate - lRate) / lRate) * 100) : 100;

    out.push({
      team_id: teamId,
      alert_type: "ab_winner",
      severity: "low",
      title: `🏆 ${wName} won your "${t.name}" test`,
      description: `${wName} converts ${lead}% better than ${lName}. Tappr is already routing 100% of new visitors to the winner. Time to pause the loser everywhere else and double down on the winning page.`,
      affected_link: t.slug,
      dedup_key: dedupKey("ab_winner", { id: t.id }),
      metadata: { test_id: t.id, winner, lead_pct: lead, wRate, lRate },
    });
  }
  return out;
}

export async function detectGoalHit(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  // Links with a click_goal — check today's clicks against it.
  const { data: links } = await supabase
    .from("links")
    .select("id, slug, title, click_goal, click_goal_period")
    .eq("team_id", teamId)
    .not("click_goal", "is", null);
  if (!links || links.length === 0) return [];

  const today = startOfDay();
  const out: DetectedAlert[] = [];

  for (const l of links) {
    if (!l.click_goal) continue;
    const since = (() => {
      if (l.click_goal_period === "weekly") return new Date(today.getTime() - 7 * 86_400_000);
      if (l.click_goal_period === "monthly") {
        const d = new Date(today); d.setDate(1); return d;
      }
      return today;
    })();
    const { count } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .eq("link_id", l.id)
      .gte("clicked_at", since.toISOString());

    if ((count ?? 0) >= l.click_goal) {
      const period = l.click_goal_period || "daily";
      out.push({
        team_id: teamId,
        alert_type: "goal_hit",
        severity: "low",
        title: `🎯 "${l.title || l.slug}" hit its ${period} goal`,
        description: `${count} clicks on tappr.me/${l.slug} ${period === "daily" ? "today" : period === "weekly" ? "this week" : "this month"} — past your goal of ${l.click_goal}. Consider raising the goal to ${l.click_goal * 2} or scaling the traffic source that's working.`,
        affected_link: l.slug,
        dedup_key: dedupKey("goal_hit", { id: l.id }),
        metadata: { link_id: l.id, count, goal: l.click_goal, period },
      });
    }
  }
  return out;
}

export async function detectTrafficSpike(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const hourAgo = new Date(Date.now() - 60 * 60_000);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { count: lastHour } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds)
    .gte("clicked_at", hourAgo.toISOString());

  const { count: last24h } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds)
    .gte("clicked_at", dayAgo.toISOString())
    .lt("clicked_at", hourAgo.toISOString());

  const avgPerHour = (last24h ?? 0) / 23;
  if (avgPerHour < 5) return [];                // too quiet to call
  if ((lastHour ?? 0) < avgPerHour * 3) return [];

  const ratio = Math.round((lastHour ?? 0) / avgPerHour);
  return [{
    team_id: teamId,
    alert_type: "traffic_spike",
    severity: "low",
    title: `🚀 Traffic is ${ratio}× normal this hour`,
    description: `${lastHour} clicks in the last 60 minutes vs an average of ${Math.round(avgPerHour)}/hour. Something's working — check your traffic sources, push more budget, or fire your retargeting pixel while it's hot.`,
    affected_link: null,
    dedup_key: dedupKey("traffic_spike"),
    metadata: { last_hour: lastHour ?? 0, avg_per_hour: avgPerHour, ratio },
  }];
}

export async function detectPeakHourShift(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { data: recent } = await supabase
    .from("link_clicks")
    .select("clicked_at")
    .in("link_id", linkIds)
    .gte("clicked_at", sevenDaysAgo.toISOString());

  const { data: historic } = await supabase
    .from("link_clicks")
    .select("clicked_at")
    .in("link_id", linkIds)
    .gte("clicked_at", thirtyDaysAgo.toISOString())
    .lt("clicked_at", sevenDaysAgo.toISOString());

  if (!recent || recent.length < 100 || !historic || historic.length < 100) return [];

  const peakHour = (rows: { clicked_at: string }[]) => {
    const buckets = new Array(24).fill(0);
    for (const r of rows) buckets[new Date(r.clicked_at).getHours()]++;
    let best = 0, bestIdx = 0;
    buckets.forEach((c, i) => { if (c > best) { best = c; bestIdx = i; } });
    return bestIdx;
  };

  const newPeak = peakHour(recent);
  const oldPeak = peakHour(historic);
  if (newPeak === oldPeak || Math.abs(newPeak - oldPeak) < 2) return [];

  return [{
    team_id: teamId,
    alert_type: "peak_hour_shift",
    severity: "low",
    title: `⏰ Your peak hour moved to ${newPeak}:00`,
    description: `Last week your audience was most active around ${newPeak}:00 — previously it was ${oldPeak}:00. If you're posting or scheduling ads, retime them to catch the new peak.`,
    affected_link: null,
    dedup_key: dedupKey("peak_hour_shift"),
    metadata: { new_peak: newPeak, old_peak: oldPeak },
  }];
}

// ─── TIER 3 — Strategic ───────────────────────────────────────────────

export async function detectCountryShift(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { data: recent } = await supabase
    .from("link_clicks")
    .select("country")
    .in("link_id", linkIds)
    .gte("clicked_at", sevenDaysAgo.toISOString());

  const { data: historic } = await supabase
    .from("link_clicks")
    .select("country")
    .in("link_id", linkIds)
    .gte("clicked_at", thirtyDaysAgo.toISOString())
    .lt("clicked_at", sevenDaysAgo.toISOString());

  if (!recent || recent.length < 100 || !historic || historic.length < 100) return [];

  const tally = (rows: { country: string | null }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (!r.country) continue;
      m.set(r.country, (m.get(r.country) ?? 0) + 1);
    }
    return m;
  };
  const topOf = (m: Map<string, number>) => {
    let best = ["", 0] as [string, number];
    for (const [k, v] of m.entries()) if (v > best[1]) best = [k, v];
    return best[0];
  };

  const recentMap = tally(recent);
  const historicMap = tally(historic);
  const newTop = topOf(recentMap);
  const oldTop = topOf(historicMap);
  if (!newTop || !oldTop || newTop === oldTop) return [];

  const newTopShare = (recentMap.get(newTop) ?? 0) / recent.length;
  const oldTopShareNow = (recentMap.get(oldTop) ?? 0) / recent.length;
  const oldTopShareBefore = (historicMap.get(oldTop) ?? 0) / historic.length;
  if (oldTopShareBefore - oldTopShareNow < 0.15) return []; // shift not strong enough

  return [{
    team_id: teamId,
    alert_type: "country_shift",
    severity: "medium",
    title: `🌍 Your top country changed from ${oldTop} to ${newTop}`,
    description: `${newTop} is now ${Math.round(newTopShare * 100)}% of your traffic. ${oldTop} dropped from ${Math.round(oldTopShareBefore * 100)}% to ${Math.round(oldTopShareNow * 100)}%. Consider a localised landing for ${newTop} or check why ${oldTop} faded.`,
    affected_link: null,
    dedup_key: dedupKey("country_shift"),
    metadata: { new_top: newTop, old_top: oldTop, new_top_share: newTopShare },
  }];
}

export async function detectDeviceShift(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const linkIds = await teamLinkIds(supabase, teamId);
  if (linkIds.length === 0) return [];

  const { data: recent } = await supabase
    .from("link_clicks")
    .select("device_type")
    .in("link_id", linkIds)
    .gte("clicked_at", sevenDaysAgo.toISOString());

  const { data: historic } = await supabase
    .from("link_clicks")
    .select("device_type")
    .in("link_id", linkIds)
    .gte("clicked_at", thirtyDaysAgo.toISOString())
    .lt("clicked_at", sevenDaysAgo.toISOString());

  if (!recent || recent.length < 100 || !historic || historic.length < 100) return [];

  const mobShare = (rows: { device_type: string | null }[]) => {
    let mob = 0, total = 0;
    for (const r of rows) { if (!r.device_type) continue; total++; if (r.device_type === "mobile" || r.device_type === "tablet") mob++; }
    return total > 0 ? mob / total : 0;
  };
  const newM = mobShare(recent);
  const oldM = mobShare(historic);
  const delta = newM - oldM;
  if (Math.abs(delta) < 0.2) return [];

  return [{
    team_id: teamId,
    alert_type: "device_shift",
    severity: "medium",
    title: `📱 Your mobile share moved by ${Math.round(delta * 100)} points`,
    description: `Mobile traffic is now ${Math.round(newM * 100)}% (was ${Math.round(oldM * 100)}%). Make sure your landing pages are tuned for the new mix — and double-check TikTok/Instagram in-app browser handling.`,
    affected_link: null,
    dedup_key: dedupKey("device_shift"),
    metadata: { mobile_share_now: newM, mobile_share_before: oldM, delta },
  }];
}

export async function detectStaleLinks(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: links } = await supabase
    .from("links")
    .select("id, slug")
    .eq("team_id", teamId)
    .eq("is_active", true);
  if (!links || links.length === 0) return [];

  // For each link, count recent clicks — but cap the loop so we don't blow up
  // for huge accounts. 100 active links is plenty.
  const sample = links.slice(0, 100);
  let stale = 0;
  await Promise.all(sample.map(async (l) => {
    const { count } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .eq("link_id", l.id)
      .gte("clicked_at", thirtyDaysAgo);
    if ((count ?? 0) === 0) stale++;
  }));

  if (stale < 10) return [];
  return [{
    team_id: teamId,
    alert_type: "stale_links",
    severity: "low",
    title: `🧹 ${stale} active links got zero clicks in the last 30 days`,
    description: `These links aren't pulling their weight. Archive them, repurpose the slugs, or reroute them to your best-performing offer. A tidy account is faster to navigate and easier to reason about.`,
    affected_link: null,
    dedup_key: dedupKey("stale_links"),
    metadata: { stale_count: stale, sampled: sample.length },
  }];
}

// ─── TIER 4 — Operational ─────────────────────────────────────────────

export async function detectSubscriptionExpiring(supabase: SupabaseClient, teamId: string): Promise<DetectedAlert[]> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan, status, expires_at, notes")
    .eq("team_id", teamId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub || !sub.expires_at) return [];
  const daysLeft = Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000);
  if (daysLeft > 3 || daysLeft < 0) return [];

  return [{
    team_id: teamId,
    alert_type: "subscription_expiring",
    severity: daysLeft <= 1 ? "high" : "medium",
    title: `💳 Your ${sub.plan} plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    description: `Make sure your card on file is up to date so you don't lose access. If you want to cancel, do it before the renewal date to avoid being charged.`,
    affected_link: null,
    dedup_key: dedupKey("subscription_expiring", { id: sub.id }),
    metadata: { sub_id: sub.id, plan: sub.plan, expires_at: sub.expires_at, days_left: daysLeft },
  }];
}

// ─── Orchestrator ────────────────────────────────────────────────────

export async function runAllDetectors(
  supabase: SupabaseClient,
  team: { id: string; plan: string | null }
): Promise<DetectedAlert[]> {
  const plan = team.plan ?? "free";
  const detectors: Promise<DetectedAlert[]>[] = [
    detectDestinationBroken(supabase, team.id),
    detectClickDrop(supabase, team.id),
    detectClickSpam(supabase, team.id),
    detectPlanLimit(supabase, team.id, plan),
    detectABWinner(supabase, team.id),
    detectGoalHit(supabase, team.id),
    detectTrafficSpike(supabase, team.id),
    detectPeakHourShift(supabase, team.id),
    detectCountryShift(supabase, team.id),
    detectDeviceShift(supabase, team.id),
    detectStaleLinks(supabase, team.id),
    detectSubscriptionExpiring(supabase, team.id),
  ];
  const results = await Promise.allSettled(detectors);
  const out: DetectedAlert[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
    else console.error("[alerts] detector failed:", r.reason);
  }
  return out;
}

// Common write path: re-verify acked alerts then insert new ones. Returns
// the count of inserted rows.
export async function persistDetections(
  supabase: SupabaseClient,
  teamIds: string[],
  detected: DetectedAlert[]
): Promise<number> {
  const detectedKeys = new Set(detected.map((a) => `${a.team_id}:${a.dedup_key}`));

  const { data: openAcked } = await supabase
    .from("anomaly_alerts")
    .select("id, team_id, dedup_key")
    .in("team_id", teamIds)
    .eq("is_dismissed", false)
    .eq("re_verified_after_ack", false)
    .not("acknowledged_at", "is", null);

  for (const row of openAcked ?? []) {
    if (!row.dedup_key) continue;
    const stillThere = detectedKeys.has(`${row.team_id}:${row.dedup_key}`);
    if (!stillThere) {
      await supabase
        .from("anomaly_alerts")
        .update({ re_verified_after_ack: true, is_dismissed: true })
        .eq("id", row.id);
    }
  }

  let inserted = 0;
  for (const a of detected) {
    const { error } = await supabase.from("anomaly_alerts").insert({
      team_id: a.team_id,
      severity: a.severity,
      title: a.title,
      description: a.description,
      affected_link: a.affected_link,
      alert_type: a.alert_type,
      dedup_key: a.dedup_key,
      metadata: a.metadata,
    });
    if (!error) inserted++;
  }
  return inserted;
}
