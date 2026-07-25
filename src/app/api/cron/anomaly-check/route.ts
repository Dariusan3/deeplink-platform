import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import { sendPartnerMonthlyReportEmail } from "@/lib/email";
import { finalizeABWinnerIfReady } from "@/lib/ab-testing";
import { pruneClickLogs } from "@/lib/prune-click-logs";
import { invalidateOwnerQuota } from "@/lib/click-quota";

// Uses the service-role key — this route is hit by a cron scheduler, not a
// browser. Created lazily on first request rather than at module scope:
// `next build` loads this module to collect page data, and an eager top-level
// client throws "supabaseKey is required" because the service key isn't
// available at build time.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

interface DetectedAnomaly {
  team_id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affected_link?: string;
  change_percent?: number;
}

function extractHostname(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/^https?:\/\/([^/?#:]+)/i);
  if (!match) return null;
  return match[1].toLowerCase().replace(/^www\./, "");
}

function getGoalPeriodStart(period: string, ref: Date): Date {
  if (period === "weekly") {
    const d = new Date(ref);
    const day = d.getDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day; // ISO week starts Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "monthly") {
    return new Date(ref.getFullYear(), ref.getMonth(), 1);
  }
  // daily (default)
  return new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

function getGoalPeriodEnd(period: string, ref: Date): Date {
  if (period === "weekly") {
    const start = getGoalPeriodStart("weekly", ref);
    return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  if (period === "monthly") {
    return new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  }
  const start = getGoalPeriodStart("daily", ref);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all teams with active links
  const { data: teams } = await supabase
    .from("teams")
    .select("id");

  if (!teams || teams.length === 0) {
    return NextResponse.json({ checked: 0, anomalies: 0 });
  }

  const allAnomalies: DetectedAnomaly[] = [];

  for (const team of teams) {
    // Get team's link IDs
    const { data: links } = await supabase
      .from("links")
      .select("id, slug, title")
      .eq("team_id", team.id)
      .eq("is_active", true);

    if (!links || links.length === 0) continue;

    const linkIds = links.map((l) => l.id);

    // Recent 2h clicks
    const { count: recentClicks } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", twoHoursAgo.toISOString());

    // Previous 2h clicks
    const { count: prevClicks } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", fourHoursAgo.toISOString())
      .lt("clicked_at", twoHoursAgo.toISOString());

    const recent = recentClicks ?? 0;
    const prev = prevClicks ?? 0;

    // Detect traffic spike/drop. Require an absolute volume floor first — a
    // percentage swing on tiny numbers (prev=2 → recent=3 = +50%, or
    // prev=0 → recent=1 = +100% "high") is statistical noise, not an anomaly,
    // and was the single biggest false-positive source on low-traffic teams.
    if (prev >= 20 || recent >= 20) {
      const changePercent = prev === 0
        ? (recent > 0 ? 100 : 0)
        : ((recent - prev) / prev) * 100;

      if (Math.abs(changePercent) >= 40) {
        const isDrop = changePercent < 0;
        allAnomalies.push({
          team_id: team.id,
          severity: Math.abs(changePercent) >= 70 ? "high" : "medium",
          title: isDrop ? "Traffic Drop Detected" : "Unusual Traffic Spike",
          description: isDrop
            ? `Click volume dropped ${Math.abs(changePercent).toFixed(0)}% in the last 2 hours vs previous 2 hours. Possible causes: deleted social post, link paused, or campaign ended.`
            : `Click volume surged ${changePercent.toFixed(0)}% in the last 2 hours. Something is driving unexpected traffic — check referrers.`,
          change_percent: changePercent,
        });
      }
    }

    // Detect "Link Gone Silent" — per-link check for top links
    const topLinks = links.slice(0, 5);
    for (const link of topLinks) {
      // Recent 2h for this link
      const { count: linkRecent } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", link.id)
        .gte("clicked_at", twoHoursAgo.toISOString());

      // 7-day history for avg per 2h window
      const { count: linkHistory } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", link.id)
        .gte("clicked_at", sevenDaysAgo.toISOString());

      const avgPer2h = (linkHistory ?? 0) / 84; // 84 two-hour windows in 7 days

      if ((linkRecent ?? 0) === 0 && avgPer2h > 5) {
        allAnomalies.push({
          team_id: team.id,
          severity: "medium",
          title: "Link Gone Silent",
          description: `"${link.title || link.slug}" had 0 clicks in the last 2 hours but averages ${avgPer2h.toFixed(0)}/2hr. Check if source content was removed.`,
          affected_link: link.slug,
        });
      }
    }

    // Detect "Paused Link Still Trafficked" — a paused link still receives
    // clicks, usually because old posts/bookmarks link to it. User should
    // either re-activate or add a redirect rule to the new destination.
    const { data: pausedLinks } = await supabase
      .from("links")
      .select("id, slug, title")
      .eq("team_id", team.id)
      .eq("is_active", false);

    if (pausedLinks && pausedLinks.length > 0) {
      for (const link of pausedLinks) {
        const { count: pausedClicks } = await supabase
          .from("link_clicks")
          .select("*", { count: "exact", head: true })
          .eq("link_id", link.id)
          .gte("clicked_at", oneDayAgo.toISOString());

        if ((pausedClicks ?? 0) >= 20) {
          allAnomalies.push({
            team_id: team.id,
            severity: "low",
            title: "Paused Link Still Trafficked",
            description: `"${link.title || link.slug}" is paused but received ${pausedClicks} clicks in the last 24h. Old posts or bookmarks still point to it — consider re-activating with a new destination or a redirect rule.`,
            affected_link: link.slug,
          });
        }
      }
    }

    // Detect "Traffic Concentration Risk" — a single referrer driving >70%
    // of a link's clicks. Dangerous dependency: if that source dies, traffic
    // vanishes. Only checks top links with ≥100 clicks over 7 days so we
    // don't alert on small-volume noise.
    for (const link of topLinks) {
      const { data: recentClicks } = await supabase
        .from("link_clicks")
        .select("referer")
        .eq("link_id", link.id)
        .gte("clicked_at", sevenDaysAgo.toISOString());

      if (!recentClicks || recentClicks.length < 100) continue;

      const referrerCounts = new Map<string, number>();
      for (const c of recentClicks) {
        const host = extractHostname(c.referer as string | null) || "direct";
        referrerCounts.set(host, (referrerCounts.get(host) || 0) + 1);
      }

      const sorted = [...referrerCounts.entries()].sort((a, b) => b[1] - a[1]);
      const [topHost, topCount] = sorted[0];
      const share = topCount / recentClicks.length;

      // Ignore "direct" — direct traffic isn't a single-source dependency,
      // it's many sources summed under the no-referer bucket.
      if (share > 0.7 && topHost !== "direct") {
        allAnomalies.push({
          team_id: team.id,
          severity: "medium",
          title: "Traffic Concentration Risk",
          description: `"${link.title || link.slug}" gets ${(share * 100).toFixed(0)}% of its clicks from ${topHost}. If that source goes down, you lose most of your traffic — diversify.`,
          affected_link: link.slug,
          change_percent: share * 100,
        });
      }
    }

    // Detect "Goal Miss Risk" — proactive: partway through a goal period
    // but pace is low enough that the projected total will miss the goal
    // by ≥30%. Only fires after >50% of the period has elapsed so we don't
    // spam the user first thing in the morning.
    const { data: goalLinks } = await supabase
      .from("links")
      .select("id, slug, title, click_goal, click_goal_period")
      .eq("team_id", team.id)
      .eq("is_active", true)
      .not("click_goal", "is", null)
      .gt("click_goal", 0);

    if (goalLinks) {
      for (const link of goalLinks) {
        const period = link.click_goal_period || "daily";
        const periodStart = getGoalPeriodStart(period, now);
        const periodEnd = getGoalPeriodEnd(period, now);
        const totalMs = periodEnd.getTime() - periodStart.getTime();
        const elapsedMs = now.getTime() - periodStart.getTime();
        const elapsedPct = elapsedMs / totalMs;

        if (elapsedPct < 0.5) continue;

        const { count: actualClicks } = await supabase
          .from("link_clicks")
          .select("*", { count: "exact", head: true })
          .eq("link_id", link.id)
          .gte("clicked_at", periodStart.toISOString());

        const actual = actualClicks ?? 0;
        const projected = Math.round(actual / elapsedPct);
        const goal = link.click_goal as number;

        if (projected < goal * 0.7) {
          const shortfallPct = Math.round((1 - projected / goal) * 100);
          allAnomalies.push({
            team_id: team.id,
            severity: "medium",
            title: "Goal Miss Risk",
            description: `"${link.title || link.slug}" is at ${actual}/${goal} ${period} clicks with ${Math.round(elapsedPct * 100)}% of the period elapsed. At current pace you'll hit ~${projected} — ${shortfallPct}% short of goal.`,
            affected_link: link.slug,
            change_percent: -shortfallPct,
          });
        }
      }
    }
  }

  if (allAnomalies.length === 0) {
    return NextResponse.json({ checked: teams.length, anomalies: 0 });
  }

  // Enhance with AI (batch all anomalies)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const enhancePrompt = `Anomalies detected in a link management platform:
${JSON.stringify(allAnomalies.map((a) => ({ title: a.title, description: a.description })), null, 2)}

For each anomaly, provide ONE likely root cause and ONE immediate action in JSON format:
{"enhanced": [{"rootCause": "...", "action": "..."}]}

Reply with only the JSON, no other text.`;

      const aiResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 512,
        messages: [{ role: "user", content: enhancePrompt }],
      });

      const text = aiResponse.choices[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhanced = JSON.parse(jsonMatch[0]);
        if (enhanced.enhanced) {
          allAnomalies.forEach((a, i) => {
            if (enhanced.enhanced[i]) {
              (a as any).root_cause = enhanced.enhanced[i].rootCause;
              (a as any).action = enhanced.enhanced[i].action;
            }
          });
        }
      }
    } catch {
      // AI enhancement failed silently — save basic anomalies
    }
  }

  // Deduplicate: don't insert if the same team+title+affected_link fired in the
  // last 7 DAYS. This cron runs once daily, so the old 4-hour window meant a
  // persistent condition (a silent link, a concentrated referrer) re-inserted a
  // fresh alert EVERY morning — the main reason the alert list felt spammy. A
  // weekly window matches the detector system's own weekly dedup buckets.
  // affected_link keying still lets different links sharing a title coexist.
  const insertAnomalies = [];
  for (const anomaly of allAnomalies) {
    const dedupQuery = supabase
      .from("anomaly_alerts")
      .select("*", { count: "exact", head: true })
      .eq("team_id", anomaly.team_id)
      .eq("title", anomaly.title)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (anomaly.affected_link) {
      dedupQuery.eq("affected_link", anomaly.affected_link);
    } else {
      dedupQuery.is("affected_link", null);
    }

    const { count } = await dedupQuery;

    if ((count ?? 0) === 0) {
      insertAnomalies.push({
        team_id: anomaly.team_id,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        root_cause: (anomaly as any).root_cause || null,
        action: (anomaly as any).action || null,
        affected_link: anomaly.affected_link || null,
        change_percent: anomaly.change_percent || null,
      });
    }
  }

  if (insertAnomalies.length > 0) {
    const { error } = await supabase.from("anomaly_alerts").insert(insertAnomalies);
    if (error) {
      console.error("Failed to insert anomaly alerts:", error.message);
    }
    // NOTE: alert EMAILS are no longer sent from here. They now come solely from
    // the detector system (/api/cron/tier1-alerts → sendAlertDigestEmail), which
    // has proper per-condition dedup/cooldown. This route still writes in-app
    // anomalies but never emails — that removed the daily-repeat spam.
  }

  // Finalize A/B test winners that already met the threshold but never had
  // a visit to trigger the in-request check. Piggybacks on this cron since
  // Vercel Hobby caps us to 1 daily cron.
  const { data: runningTests } = await supabase
    .from("ab_tests")
    .select(
      "id, team_id, name, slug, status, variant_a_name, variant_a_url, variant_a_visits, variant_a_conversions, variant_b_name, variant_b_url, variant_b_visits, variant_b_conversions, auto_optimize, min_conversions, threshold_percent, winner"
    )
    .eq("status", "running")
    .eq("auto_optimize", true)
    .is("winner", null);

  let abWinners = 0;
  if (runningTests) {
    for (const test of runningTests) {
      const winner = await finalizeABWinnerIfReady(supabase, test).catch((err) => {
        console.error(`A/B finalize failed for ${test.id}:`, err);
        return null;
      });
      if (winner) abWinners++;
    }
  }

  // Subscription finalizer — the boundary where scheduled downgrades and
  // cancel-at-period-end actually take effect. A paid subscription whose paid
  // period has ended (1-day grace to absorb a late renewal webhook) is expired
  // here; that fires the sync_team_plan trigger (migration 024), which recomputes
  // owner_best_plan and drops the team to its next-best active plan — the lower
  // plan on a downgrade, or free on a plain cancel. A still-renewing sub always
  // has expires_at ~30 days out, so it's never caught.
  let subsExpired = 0;
  const graceCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data: lapsed } = await supabase
    .from("subscriptions")
    .update({ status: "expired", notes: "Period ended — expired by finalizer" })
    .eq("status", "active")
    .eq("is_free", false)
    .not("expires_at", "is", null)
    .lt("expires_at", graceCutoff)
    .select("team_id");
  if (lapsed && lapsed.length > 0) {
    subsExpired = lapsed.length;
    for (const tid of [...new Set(lapsed.map((r) => r.team_id))]) {
      await invalidateOwnerQuota(supabase, tid).catch(() => {});
    }
  }

  // Partner monthly report — fires only on the 1st of each month so partners
  // get a recap of the previous month's earnings + new referrals + active count.
  let partnerReports = 0;
  const today = new Date();
  if (today.getUTCDate() === 1) {
    const prev = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const prevMonthKey = prev.toISOString().slice(0, 7);
    const prevMonthName = prev.toLocaleString("en-US", { month: "long", year: "numeric" });
    const monthStart = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth(), 1)).toISOString();
    const monthEnd = new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)).toISOString();

    const { data: partners } = await supabase
      .from("partner_profiles")
      .select("id, user_id, pending_payout");

    if (partners) {
      for (const p of partners) {
        // Total earned for the previous month
        const { data: earningsRows } = await supabase
          .from("partner_earnings")
          .select("amount")
          .eq("partner_id", p.id)
          .eq("period_month", `${prevMonthKey}-01`);
        const totalEarned = (earningsRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

        // New referrals signed in the previous month
        const { count: newCount } = await supabase
          .from("partner_referrals")
          .select("*", { count: "exact", head: true })
          .eq("partner_id", p.id)
          .gte("signed_up_at", monthStart)
          .lt("signed_up_at", monthEnd);

        // Currently active referrals
        const { count: activeCount } = await supabase
          .from("partner_referrals")
          .select("*", { count: "exact", head: true })
          .eq("partner_id", p.id)
          .eq("status", "active");

        // Skip silent partners (no activity, no balance)
        if (!totalEarned && !newCount && Number(p.pending_payout) === 0) continue;

        const { data: u } = await supabase
          .from("users").select("email, full_name").eq("id", p.user_id).single();
        if (!u?.email) continue;

        await sendPartnerMonthlyReportEmail({
          to: u.email,
          name: u.full_name || u.email.split("@")[0],
          totalEarned,
          newReferrals: newCount ?? 0,
          activeReferrals: activeCount ?? 0,
          pendingPayout: Number(p.pending_payout),
          monthName: prevMonthName,
        }).catch((err) => console.error("Partner monthly email failed:", err));

        partnerReports++;
      }
    }
  }

  // Data retention (GDPR Art. 5(1)(e)) — piggybacked here because Vercel Hobby
  // caps scheduled jobs to one/day. Anonymises IP + user-agent on click/A/B
  // events older than the retention window. Non-fatal if it errors.
  let retention: Record<string, string> = {};
  try {
    ({ results: retention } = await pruneClickLogs(supabase));
  } catch (err) {
    console.error("Click-log pruning failed:", err);
    retention = { error: "prune failed" };
  }

  return NextResponse.json({
    checked: teams.length,
    detected: allAnomalies.length,
    saved: insertAnomalies.length,
    ab_winners_finalized: abWinners,
    subscriptions_expired: subsExpired,
    partner_reports_sent: partnerReports,
    retention,
  });
}
