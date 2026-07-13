"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useTeam } from "@/hooks/use-team";
import type { AlertMetrics } from "@/lib/alert-metrics";
import { cn } from "@/lib/utils";
import {
  Gauge,
  TrendingDown,
  Rocket,
  Clock,
  Globe,
  Smartphone,
  Link2,
  Trash2,
  Trophy,
  ShieldAlert,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

// Shown below the alert list on /dashboard/alerts, behind a disclosure.
//
// This answers exactly one question: "why did (or didn't) this detector fire?"
// The honest shape of that answer is a reading next to a threshold — so it's a
// table, one row per detector, not twelve tiles.
//
// It used to be a 12-card grid split across three sections, each with its own
// heading and subtitle, nested inside a disclosure that already had a heading.
// Four levels of titling for a diagnostics panel. Two of the cards ("Today vs
// 7-day avg" and "Clicks today") were the same number framed twice, and one
// (plan usage) repeated the bar already sitting at the top of the page. What it
// never showed was the thing you actually need — the threshold the reading is
// being compared against.

// Per-team metrics cache (stale-while-revalidate) — the /api/alerts/metrics
// endpoint aggregates every detector server-side so it's the heavy part of
// the alerts page. Cache the last result so the rows paint instantly on
// repeat visits, then refresh in the background.
const METRICS_CACHE_PREFIX = "tappr_alert_metrics_cache_";
function readMetricsCache(teamId: string): AlertMetrics | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(METRICS_CACHE_PREFIX + teamId) : null;
    return raw ? (JSON.parse(raw) as AlertMetrics) : null;
  } catch { return null; }
}
function writeMetricsCache(teamId: string, metrics: AlertMetrics) {
  try { localStorage.setItem(METRICS_CACHE_PREFIX + teamId, JSON.stringify(metrics)); } catch {}
}

// firing → the condition is true right now and is bad news.
// winning → true right now and is good news (a spike, an A/B winner).
// near    → not there yet, but close enough that you should know.
// quiet   → nothing to say. The resting state, and most rows most days.
// off     → detector disabled in runAllDetectors.
type State = "firing" | "winning" | "near" | "quiet" | "off";

// Three signal colours only — red, amber, green — matching the alert list. A
// `quiet` detector is the resting state and gets no colour at all: if most cards
// are lit, none of them mean anything.
const STATE_STYLE: Record<State, { tint: string; value: string; border: string }> = {
  firing:  { tint: "bg-red-500/10",   value: "text-red-400",     border: "border-red-500/30"   },
  winning: { tint: "bg-[#00D26A]/10", value: "text-[#00D26A]",   border: "border-[#00D26A]/30" },
  near:    { tint: "bg-amber-500/10", value: "text-amber-400",   border: "border-amber-500/30" },
  quiet:   { tint: "bg-white/5",      value: "text-neutral-200", border: "border-white/5"      },
  off:     { tint: "bg-white/5",      value: "text-neutral-600", border: "border-white/5"      },
};

type Row = {
  icon: LucideIcon;
  label: string;
  value: string;
  // The threshold, in the user's words. This is the payload of the whole panel:
  // a reading with no rule next to it doesn't explain anything.
  rule: string;
  state: State;
};

function buildRows(m: AlertMetrics): Row[] {
  const uncapped = m.planCap === null;
  const sign = m.todayVsAvgPct >= 0 ? "+" : "";
  const spike = m.spikeRatio >= 3 && m.clicksLastHour >= 25 && m.hourAvg24h >= 5;
  const countryShifted =
    m.topCountryNow !== null && m.topCountryBefore !== null && m.topCountryNow !== m.topCountryBefore;
  const mobileDelta = m.mobileShareNow - m.mobileShareBefore;
  const subExpiring = m.subDaysLeft !== null && m.subDaysLeft <= 3 && m.subDaysLeft >= 0;

  return [
    {
      icon: Link2,
      label: "Destinations",
      value: m.brokenDestinations > 0 ? `${m.brokenDestinations} broken` : "All OK",
      rule:
        m.brokenSamples.length > 0
          ? m.brokenSamples.map((s) => `${s.slug} (${s.status})`).join(" · ")
          : `${m.linksActive} active · fires on 404, 410 or 5xx`,
      state: m.brokenDestinations > 0 ? "firing" : "quiet",
    },
    {
      icon: TrendingDown,
      label: "Today vs 7-day avg",
      value: `${sign}${m.todayVsAvgPct}%`,
      rule: `${m.clicksToday.toLocaleString()} today vs ${Math.round(m.clicksAvg7d).toLocaleString()}/day · fires below -60%`,
      state:
        m.todayVsAvgPct <= -60 && m.clicksAvg7d >= 10 ? "firing"
        : m.todayVsAvgPct <= -40 ? "near"
        : "quiet",
    },
    {
      icon: ShieldAlert,
      label: "Top IP, last hour",
      value: m.topIpLastHour ? `${m.topIpLastHour.count} hits` : "Quiet",
      rule: m.topIpLastHour
        ? `${m.topIpLastHour.ip} · fires at 30+ in 60 min`
        : "No clicks in the last 60 min · fires at 30+",
      state:
        (m.topIpLastHour?.count ?? 0) >= 30 ? "firing"
        : (m.topIpLastHour?.count ?? 0) >= 20 ? "near"
        : "quiet",
    },
    {
      icon: Gauge,
      label: "Plan usage",
      value: uncapped ? `${m.clicksThisMonth.toLocaleString()}` : `${m.monthPct}%`,
      rule: uncapped
        ? `${m.plan} · unlimited clicks, never fires`
        : `${m.clicksThisMonth.toLocaleString()} / ${m.planCap!.toLocaleString()} · fires at 80% and 100%`,
      state:
        uncapped ? "quiet"
        : m.monthPct >= 100 ? "firing"
        : m.monthPct >= 80 ? "near"
        : "quiet",
    },
    {
      icon: Rocket,
      label: "Last-hour pace",
      value: m.spikeRatio > 0 ? `${m.spikeRatio.toFixed(1)}×` : "—",
      rule: `${m.clicksLastHour} last hour vs ${Math.round(m.hourAvg24h)}/h · fires at 3× and 25+ clicks`,
      state: spike ? "winning" : "quiet",
    },
    {
      icon: Trophy,
      label: "A/B tests",
      value: `${m.abRunning} running`,
      rule:
        m.abRecentWinners > 0
          ? `${m.abRecentWinners} winner${m.abRecentWinners === 1 ? "" : "s"} confirmed in the last 24h`
          : m.abRunning === 0
            ? "No tests running · fires when a winner is confirmed"
            : "Collecting data · fires when a winner is confirmed",
      state: m.abRecentWinners > 0 ? "winning" : "quiet",
    },
    {
      icon: Globe,
      label: "Top country (7d)",
      value: m.topCountryNow
        ? `${m.topCountryNow} ${Math.round(m.topCountryNowShare * 100)}%`
        : "—",
      rule: countryShifted
        ? `Was ${m.topCountryBefore} · fires when the old leader drops 20+ points and the new one holds 35%+`
        : "Fires when the old leader drops 20+ points and the new one holds 35%+",
      state: countryShifted ? "near" : "quiet",
    },
    {
      icon: Smartphone,
      label: "Mobile share (7d)",
      value: m.mobileShareNow > 0 ? `${Math.round(m.mobileShareNow * 100)}%` : "—",
      rule:
        m.mobileShareBefore > 0
          ? `Was ${Math.round(m.mobileShareBefore * 100)}% · fires on a 20-point swing`
          : "Not enough history yet · fires on a 20-point swing",
      state: Math.abs(mobileDelta) >= 0.2 ? "near" : "quiet",
    },
    {
      icon: Trash2,
      label: "Stale links (30d)",
      value: `${m.linksStale}`,
      rule: `${m.linksActive} active · fires at 10 or more with zero clicks`,
      state: m.linksStale >= 10 ? "near" : "quiet",
    },
    {
      icon: CreditCard,
      label: "Subscription",
      value:
        m.subStatus === "active" && m.subDaysLeft !== null
          ? `${m.subDaysLeft}d left`
          : m.subStatus === "none"
            ? "Free plan"
            : m.subStatus,
      rule: m.subPlan
        ? `${m.subPlan} · fires 3 days before renewal`
        : "No paid subscription on file",
      state: subExpiring ? "firing" : "quiet",
    },
    {
      icon: Clock,
      label: "Peak hour (7d)",
      value: m.peakHourNow !== null ? `${m.peakHourNow}:00` : "—",
      // Kept visible on purpose. The number is still worth glancing at, and a
      // silently missing row would read as a bug rather than a decision.
      rule:
        m.peakHourBefore !== null
          ? `Was ${m.peakHourBefore}:00 · detector off, it flapped daily`
          : "Detector off, it flapped daily",
      state: "off",
    },
  ];
}

export function MetricsDashboard({ refreshKey }: { refreshKey: number }) {
  const { activeTeam } = useTeam();
  // Deterministic initial state (null/loading) so SSR + first client render
  // match; the cached snapshot is applied in an effect after mount.
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from cache post-mount.
  useEffect(() => {
    if (!activeTeam?.id) return;
    const cached = readMetricsCache(activeTeam.id);
    if (cached) { setMetrics(cached); setLoading(false); }
  }, [activeTeam?.id]);

  const fetchMetrics = useCallback(async () => {
    if (!activeTeam?.id) return;
    // Only show the skeleton when there's nothing cached to display.
    if (!readMetricsCache(activeTeam.id)) setLoading(true);
    try {
      const res = await fetch(`/api/alerts/metrics?team_id=${activeTeam.id}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        writeMetricsCache(activeTeam.id, data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTeam?.id]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics, refreshKey]);

  const rows = useMemo(() => (metrics ? buildRows(metrics) : []), [metrics]);

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 p-3">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 p-3">
      {rows.map((r) => {
        const style = STATE_STYLE[r.state];
        return (
          <div
            key={r.label}
            className={cn(
              "rounded-xl border p-3 transition-colors",
              r.state === "off" ? "border-white/5 opacity-50" : style.border
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", style.tint, style.value)}>
                <r.icon className="w-3 h-3" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 leading-none truncate">
                {r.label}
              </p>
            </div>

            <p className={cn("text-xl font-black tracking-tight leading-none tabular-nums", style.value)}>
              {r.value}
            </p>

            {/* The rule. This is the payload of the whole panel: a reading with
                no threshold next to it explains nothing. */}
            <p className="text-[10px] text-neutral-600 mt-1.5 leading-tight line-clamp-2">
              {r.rule}
            </p>
          </div>
        );
      })}
    </div>
  );
}
