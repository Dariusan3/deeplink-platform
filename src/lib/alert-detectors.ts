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
  ALERT_TIERS,
} from "./alerts";
import { entitlements } from "./entitlements";

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

// Statuses that actually mean "your visitors are hitting a dead page".
//
// The old check alerted on any status >= 400, which is why the list filled up
// with links that opened perfectly well in a browser. A live, healthy page
// routinely answers:
//   401 / 403 — the origin blocks datacenter IPs or unknown user agents
//   405       — the origin doesn't implement HEAD (very common)
//   429       — we got rate-limited, which says nothing about the page
// None of those are the destination being broken. 404/410 (gone) and 5xx
// (origin is erroring) are.
function isDecisivelyBroken(status: number): boolean {
  return status === 404 || status === 410 || status >= 500;
}

const PROBE_TIMEOUT_MS = 6000;
// Some origins 403 anything that doesn't look like a browser.
const PROBE_UA =
  "Mozilla/5.0 (compatible; TapprLinkCheck/1.0; +https://tappr.me/bot)";

async function probe(url: string, method: "HEAD" | "GET"): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": PROBE_UA, accept: "*/*" },
    });
    return res.status;
  } catch {
    // Timeout, DNS failure, TLS error, aborted. We don't know anything, and
    // guessing "broken" here is exactly how a flaky network run turns into a
    // page full of alerts about links that were never down.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// null = inconclusive (network failure — say nothing, resolve nothing).
async function checkDestination(url: string): Promise<number | null> {
  const head = await probe(url, "HEAD");
  if (head !== null && head < 400) return head;
  // HEAD said "bad" (or said nothing). Before we accuse the destination, ask for
  // it the way a real visitor does. This one retry is what separates "the origin
  // doesn't do HEAD" from "the page is gone".
  const get = await probe(url, "GET");
  return get ?? head;
}

// Run `worker` over `items` with at most `limit` in flight. The old version used
// a bare Promise.all over a hard-capped 25 links — the cap meant a team with 40
// links never got the other 15 checked, and left us unable to auto-close alerts
// (an unchecked link is not a healthy link).
async function pool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

export type DestinationScan = {
  alerts: DetectedAlert[];
  // dedup_keys we positively confirmed healthy this run (the probe came back
  // < 400). Only these are safe to auto-close: absence of an alert could just
  // mean the probe timed out.
  healthy: string[];
};

export async function detectDestinationBroken(supabase: SupabaseClient, teamId: string): Promise<DestinationScan> {
  const { data: links } = await supabase
    .from("links")
    .select("id, slug, destination_url, title")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .limit(200);
  if (!links || links.length === 0) return { alerts: [], healthy: [] };

  const alerts: DetectedAlert[] = [];
  const healthy: string[] = [];

  await pool(links, 8, async (l) => {
    if (!l.destination_url) return;
    const status = await checkDestination(l.destination_url);
    if (status === null) return; // inconclusive — neither alert nor resolve

    const key = dedupKey("destination_broken", { id: l.id });
    if (!isDecisivelyBroken(status)) {
      healthy.push(key);
      return;
    }
    alerts.push({
      team_id: teamId,
      alert_type: "destination_broken",
      severity: status >= 500 ? "high" : "medium",
      title: `Link "${l.title || l.slug}" destination returns ${status}`,
      description: `${l.destination_url} responded with HTTP ${status}. Visitors clicking your link are reaching a broken page. Fix the destination URL or replace it.`,
      affected_link: l.slug,
      dedup_key: key,
      metadata: { status, url: l.destination_url, link_id: l.id },
    });
  });

  return { alerts, healthy };
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

  // Agency has no cap. Without this the detector would compute used/Infinity = 0%
  // and never fire — harmless — but it would still burn a count query on every
  // run for a team that can never hit a limit.
  if (!Number.isFinite(cap)) return [];

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
      title: `${wName} won your "${t.name}" test`,
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
        title: `"${l.title || l.slug}" hit its ${period} goal`,
        description: `${count} clicks on tappr.me/${l.slug} ${period === "daily" ? "today" : period === "weekly" ? "this week" : "this month"} — past your goal of ${l.click_goal}. Consider raising the goal to ${l.click_goal * 2} or scaling the traffic source that's working.`,
        affected_link: l.slug,
        // Bucket by the goal's own period. Without this a monthly goal cleared on
        // the 5th re-fired every day until the 30th: the clicks stayed past the
        // goal, and the key only changed when the date did.
        dedup_key: dedupKey("goal_hit", { id: l.id, period }),
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

  // Three gates, and the absolute floor is the one that matters. On a quiet
  // account "3× normal" is 18 clicks instead of 6 — technically a spike, not
  // remotely worth an alert, and it fired most days. A spike has to be big in
  // ratio AND big in absolute terms before it's news.
  const MIN_AVG_PER_HOUR = 5;
  const MIN_CLICKS_LAST_HOUR = 25;
  const MIN_RATIO = 3;

  const avgPerHour = (last24h ?? 0) / 23;
  if (avgPerHour < MIN_AVG_PER_HOUR) return [];          // too quiet to call
  if ((lastHour ?? 0) < MIN_CLICKS_LAST_HOUR) return [];
  if ((lastHour ?? 0) < avgPerHour * MIN_RATIO) return [];

  const ratio = Math.round((lastHour ?? 0) / avgPerHour);
  return [{
    team_id: teamId,
    alert_type: "traffic_spike",
    severity: "low",
    title: `Traffic is ${ratio}× normal this hour`,
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
    title: `Your peak hour moved to ${newPeak}:00`,
    description: `Last week your audience was most active around ${newPeak}:00 — previously it was ${oldPeak}:00. If you're posting or scheduling ads, retime them to catch the new peak.`,
    affected_link: null,
    dedup_key: dedupKey("peak_hour_shift"),
    metadata: { new_peak: newPeak, old_peak: oldPeak },
  }];
}

// ─── TIER 3 — Strategic ───────────────────────────────────────────────

// Both trend detectors compare the last 7 days against the 23 before them. With
// only 100 clicks in a window, a single busy afternoon from one country moves the
// "top country" — so the old floor was low enough to manufacture trends out of
// noise. A trend claim needs a sample big enough to be a trend.
const MIN_TREND_SAMPLE = 250;

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

  if (!recent || recent.length < MIN_TREND_SAMPLE || !historic || historic.length < MIN_TREND_SAMPLE) return [];

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
  // Two links can trade the #1 spot at 21% vs 20% without anything having
  // happened. Demand that the old leader genuinely collapsed AND that the new
  // leader is actually leading.
  if (oldTopShareBefore - oldTopShareNow < 0.2) return [];
  if (newTopShare < 0.35) return [];

  return [{
    team_id: teamId,
    alert_type: "country_shift",
    severity: "medium",
    title: `Your top country changed from ${oldTop} to ${newTop}`,
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

  if (!recent || recent.length < MIN_TREND_SAMPLE || !historic || historic.length < MIN_TREND_SAMPLE) return [];

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
    title: `Your mobile share moved by ${Math.round(delta * 100)} points`,
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
    title: `${stale} active links got zero clicks in the last 30 days`,
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
    title: `Your ${sub.plan} plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    description: `Make sure your card on file is up to date so you don't lose access. If you want to cancel, do it before the renewal date to avoid being charged.`,
    affected_link: null,
    dedup_key: dedupKey("subscription_expiring", { id: sub.id }),
    metadata: { sub_id: sub.id, plan: sub.plan, expires_at: sub.expires_at, days_left: daysLeft },
  }];
}

// ─── Orchestrator ────────────────────────────────────────────────────

// What one pass over one team produced. `resolved` and `ran` exist so
// persistDetections can close alerts that no longer apply WITHOUT ever closing
// one just because a detector crashed or a probe timed out.
export type DetectorRun = {
  alerts: DetectedAlert[];
  // `${team_id}:${dedup_key}` we positively confirmed cleared this run.
  resolved: string[];
  // `${team_id}:${alert_type}` for every detector that completed without
  // throwing. A detector that threw tells us nothing about its condition.
  ran: string[];
};

export function emptyRun(): DetectorRun {
  return { alerts: [], resolved: [], ran: [] };
}

export function mergeRuns(runs: DetectorRun[]): DetectorRun {
  return {
    alerts:   runs.flatMap((r) => r.alerts),
    resolved: runs.flatMap((r) => r.resolved),
    ran:      runs.flatMap((r) => r.ran),
  };
}

export async function runAllDetectors(
  supabase: SupabaseClient,
  team: { id: string; plan: string | null }
): Promise<DetectorRun> {
  const plan = team.plan ?? "free";

  // Each entry declares which alert types it is authoritative for, so a detector
  // that throws can be excluded from auto-close.
  const specs: { types: AlertType[]; run: () => Promise<DetectedAlert[]> }[] = [
    { types: ["click_drop"],            run: () => detectClickDrop(supabase, team.id) },
    { types: ["click_spam"],            run: () => detectClickSpam(supabase, team.id) },
    { types: ["plan_limit"],            run: () => detectPlanLimit(supabase, team.id, plan) },
    { types: ["ab_winner"],             run: () => detectABWinner(supabase, team.id) },
    { types: ["goal_hit"],              run: () => detectGoalHit(supabase, team.id) },
    { types: ["traffic_spike"],         run: () => detectTrafficSpike(supabase, team.id) },
    // detectPeakHourShift — disabled: peak-hour naturally flaps day to day,
    // so this fired constantly with almost no actionable value. It was the
    // 2nd-noisiest alert in production. Kept the function in case we want a
    // much stricter version later.
    { types: ["country_shift"],         run: () => detectCountryShift(supabase, team.id) },
    { types: ["device_shift"],          run: () => detectDeviceShift(supabase, team.id) },
    { types: ["stale_links"],           run: () => detectStaleLinks(supabase, team.id) },
    { types: ["subscription_expiring"], run: () => detectSubscriptionExpiring(supabase, team.id) },
  ];

  const out: DetectorRun = emptyRun();

  // destination_broken is special: it reports health per link, not just failure,
  // because "no alert" from a network probe could equally mean "timed out".
  const dest = await detectDestinationBroken(supabase, team.id).catch((e) => {
    console.error("[alerts] destination probe failed:", e);
    return null;
  });
  if (dest) {
    out.alerts.push(...dest.alerts);
    out.resolved.push(...dest.healthy.map((k) => `${team.id}:${k}`));
    out.ran.push(`${team.id}:destination_broken`);
  }

  // Anomaly-alert entitlement: pricing sells free as "Basic" (Tier-1 only,
  // the "losing money right now" alerts) and paid plans as "All 12 types".
  // destination_broken (Tier 1) already ran above, so it's unaffected.
  const anomalyLevel = entitlements(plan).anomalyAlerts;
  const activeSpecs =
    anomalyLevel === "all"
      ? specs
      : specs.filter((s) => s.types.every((t) => ALERT_TIERS[t] === 1));

  const results = await Promise.allSettled(activeSpecs.map((s) => s.run()));
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out.alerts.push(...r.value);
      for (const t of activeSpecs[i].types) out.ran.push(`${team.id}:${t}`);
    } else {
      console.error("[alerts] detector failed:", r.reason);
    }
  });

  return out;
}

// How long a MANUALLY DISMISSED alert stays suppressed. If you dismissed
// "destination returns 404" and haven't fixed it, we don't nag you again
// tomorrow. Alerts the system closed itself (condition cleared) are exempt —
// see AUTO_CLOSE below — otherwise a link that broke, got fixed, and broke
// again would stay silent for a week.
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// Low-severity alerts stop being worth anything long before you get around to
// them. Nobody is going to action "your peak hour moved" from three weeks ago,
// and a list of them is why the page felt like a graveyard.
const LOW_SEVERITY_TTL_MS = 21 * 24 * 60 * 60 * 1000;

// Alert types that describe a CONDITION that is either true or false right now.
// If the detector ran and did not re-detect it, the condition cleared — close
// the row automatically. You already fixed it; you shouldn't also have to tidy
// up after yourself.
//
// Everything NOT in here is a point-in-time EVENT — a goal was hit, a variant
// won, an IP burst happened. Those were true when they fired and stay true, so
// they wait to be dismissed by hand.
//
// destination_broken is a condition too, but it is deliberately absent: it is
// closed only on a probe that positively came back healthy (`run.resolved`).
// Absence of a destination_broken alert can also mean the probe timed out, and
// closing a real outage because our network hiccuped is the worst failure mode
// this file has.
const AUTO_CLOSE_ON_ABSENCE: ReadonlySet<AlertType> = new Set<AlertType>([
  "plan_limit",
  "stale_links",
  "country_shift",
  "device_shift",
  "subscription_expiring",
]);

// Common write path: close alerts whose condition has cleared, expire stale
// low-severity ones, then insert only what isn't already open or cooling down.
export async function persistDetections(
  supabase: SupabaseClient,
  teamIds: string[],
  run: DetectorRun
): Promise<{ inserted: number; closed: number; insertedAlerts: DetectedAlert[] }> {
  const detectedKeys = new Set(run.alerts.map((a) => `${a.team_id}:${a.dedup_key}`));
  const resolvedKeys = new Set(run.resolved);
  const ranTypes = new Set(run.ran);

  // ── 1. Auto-close ────────────────────────────────────────────────────
  const { data: open } = await supabase
    .from("anomaly_alerts")
    .select("id, team_id, alert_type, dedup_key, acknowledged_at")
    .in("team_id", teamIds)
    .eq("is_dismissed", false);

  const toClose: string[] = [];
  for (const row of open ?? []) {
    const type = row.alert_type as AlertType | null;
    if (!type || !row.dedup_key) continue;
    // A detector that threw is not evidence that its condition cleared.
    if (!ranTypes.has(`${row.team_id}:${type}`)) continue;

    const key = `${row.team_id}:${row.dedup_key}`;
    if (detectedKeys.has(key)) continue; // still firing

    const cleared =
      type === "destination_broken"
        ? resolvedKeys.has(key)                 // needs a positive health check
        : AUTO_CLOSE_ON_ABSENCE.has(type) || row.acknowledged_at != null;
    if (!cleared) continue;

    toClose.push(row.id);
  }

  // `re_verified_after_ack` marks a row the SYSTEM closed because it re-checked
  // and the condition was gone — as opposed to one the user dismissed by hand.
  // The cooldown in step 3 keys off exactly that difference, so it has to be set
  // on every auto-close, acknowledged or not.
  if (toClose.length > 0) {
    await supabase
      .from("anomaly_alerts")
      .update({ is_dismissed: true, re_verified_after_ack: true })
      .in("id", toClose);
  }

  // ── 2. Expire stale low-severity noise ───────────────────────────────
  const { data: expired } = await supabase
    .from("anomaly_alerts")
    .update({ is_dismissed: true, re_verified_after_ack: true })
    .in("team_id", teamIds)
    .eq("is_dismissed", false)
    .eq("severity", "low")
    .lt("created_at", new Date(Date.now() - LOW_SEVERITY_TTL_MS).toISOString())
    .select("id");

  // ── 3. Suppression set ───────────────────────────────────────────────
  // Blocked from re-inserting if the same team+dedup_key is either still open,
  // or was dismissed BY HAND inside the cooldown. Rows the system auto-closed
  // (re_verified_after_ack = true) are excluded on purpose: the condition
  // demonstrably cleared, so if it's back, that's news.
  const cutoff = new Date(Date.now() - DISMISS_COOLDOWN_MS).toISOString();
  const [openRes, dismissedRes] = await Promise.all([
    supabase
      .from("anomaly_alerts")
      .select("team_id, dedup_key")
      .in("team_id", teamIds)
      .eq("is_dismissed", false),
    supabase
      .from("anomaly_alerts")
      .select("team_id, dedup_key")
      .in("team_id", teamIds)
      .eq("is_dismissed", true)
      .eq("re_verified_after_ack", false)
      .gte("created_at", cutoff),
  ]);
  const suppressed = new Set<string>();
  for (const r of [...(openRes.data ?? []), ...(dismissedRes.data ?? [])]) {
    if (r.dedup_key) suppressed.add(`${r.team_id}:${r.dedup_key}`);
  }

  // ── 4. Insert ────────────────────────────────────────────────────────
  let inserted = 0;
  const insertedAlerts: DetectedAlert[] = [];
  for (const a of run.alerts) {
    const key = `${a.team_id}:${a.dedup_key}`;
    if (suppressed.has(key)) continue;
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
    // Add to the set on success so two detectors (or a retry) can't double-
    // insert the same key within a single run.
    if (!error) { inserted++; suppressed.add(key); insertedAlerts.push(a); }
  }
  return { inserted, closed: toClose.length + (expired?.length ?? 0), insertedAlerts };
}
