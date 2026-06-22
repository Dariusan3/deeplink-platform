"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTeam } from "@/hooks/use-team";
import type { AlertMetrics } from "@/lib/alert-metrics";
import { cn } from "@/lib/utils";
import {
  Gauge,
  TrendingDown,
  TrendingUp,
  Rocket,
  Clock,
  Globe,
  Smartphone,
  Link2,
  Trash2,
  Trophy,
  ShieldAlert,
  CreditCard,
  AlertCircle,
} from "lucide-react";

// Live dashboard shown on /dashboard/alerts above the alert list. Every
// card maps 1:1 to a detector in src/lib/alert-detectors.ts so the user
// can see the numbers behind each alert type. Re-fetches on mount and on
// `refreshKey` change (the page bumps this after "Check now").

// Per-team metrics cache (stale-while-revalidate) — the /api/alerts/metrics
// endpoint aggregates every detector server-side so it's the heavy part of
// the alerts page. Cache the last result so the cards paint instantly on
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

  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pl-1">
        <div>
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">Live metrics</h2>
          <p className="text-[10px] text-neutral-600 font-medium mt-0.5">The numbers driving each detector — updated each time you load the page</p>
        </div>
      </div>

      {/* ── Health & limits ─────────────────────────────── */}
      <SectionLabel tone="red" title="Health & limits" subtitle="What might be costing you money right now" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PlanUsageCard m={metrics} />
        <ClickDropCard m={metrics} />
        <DestinationsCard m={metrics} />
        <ClickSpamCard m={metrics} />
      </div>

      {/* ── Performance & wins ──────────────────────────── */}
      <SectionLabel tone="green" title="Performance & wins" subtitle="Where your traffic is paying off" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TrafficSpikeCard m={metrics} />
        <ABTestCard m={metrics} />
        <PeakHourCard m={metrics} />
        <TodayVsAvgCard m={metrics} />
      </div>

      {/* ── Audience & housekeeping ─────────────────────── */}
      <SectionLabel tone="amber" title="Audience & housekeeping" subtitle="Trends and account hygiene" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountryCard m={metrics} />
        <DeviceCard m={metrics} />
        <StaleLinksCard m={metrics} />
        <SubscriptionCard m={metrics} />
      </div>
    </div>
  );
}

// ── Section label ───────────────────────────────────────────────────

function SectionLabel({ tone, title, subtitle }: { tone: "red" | "green" | "amber" | "neutral"; title: string; subtitle: string }) {
  const accent =
    tone === "red"   ? "text-red-400" :
    tone === "green" ? "text-[#00D26A]" :
    tone === "amber" ? "text-amber-400" :
                       "text-neutral-300";
  return (
    <div className="pl-1">
      <h3 className={cn("text-sm font-black uppercase italic tracking-tight", accent)}>{title}</h3>
      <p className="text-[10px] text-neutral-500 font-medium">{subtitle}</p>
    </div>
  );
}

// ── Reusable metric tile ────────────────────────────────────────────

function MetricTile({
  Icon,
  label,
  value,
  hint,
  tone = "neutral",
  highlight = false,
}: {
  Icon: typeof Gauge;
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  highlight?: boolean;
}) {
  // Only three signal colours: green (good), amber (warn), red (bad).
  // "neutral" and "info" both render muted white/gray — not a 4th colour,
  // just an absence of signal.
  const toneStyles = {
    neutral: { tint: "bg-white/5",      text: "text-white",       border: "border-white/10" },
    good:    { tint: "bg-[#00D26A]/10", text: "text-[#00D26A]",   border: "border-[#00D26A]/30" },
    warn:    { tint: "bg-amber-500/10", text: "text-amber-400",   border: "border-amber-500/30" },
    bad:     { tint: "bg-red-500/10",   text: "text-red-400",     border: "border-red-500/30" },
    info:    { tint: "bg-white/5",      text: "text-neutral-300", border: "border-white/10" },
  }[tone];

  return (
    <Card className={cn(
      "glass-card transition-all",
      highlight ? toneStyles.border + " ring-1 ring-current/10" : "border-white/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", toneStyles.tint, toneStyles.text)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 leading-none">{label}</p>
        </div>
        <p className={cn("text-2xl font-black tracking-tight leading-none", toneStyles.text)}>
          {value}
        </p>
        {hint && <p className="text-[10px] text-neutral-500 mt-1.5 leading-tight">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ── Tier 1 ──────────────────────────────────────────────────────────

function PlanUsageCard({ m }: { m: AlertMetrics }) {
  const tone = m.monthPct >= 100 ? "bad" : m.monthPct >= 80 ? "warn" : "neutral";
  return (
    <MetricTile
      Icon={Gauge}
      label="Plan usage"
      value={`${m.monthPct}%`}
      hint={`${m.clicksThisMonth.toLocaleString()} / ${m.planCap.toLocaleString()} clicks · ${m.plan}`}
      tone={tone}
      highlight={m.monthPct >= 80}
    />
  );
}

function ClickDropCard({ m }: { m: AlertMetrics }) {
  const dropping = m.todayVsAvgPct < -40 && m.clicksAvg7d >= 50;
  const tone = dropping ? "bad" : m.todayVsAvgPct < 0 ? "warn" : "good";
  const sign = m.todayVsAvgPct >= 0 ? "+" : "";
  return (
    <MetricTile
      Icon={m.todayVsAvgPct < 0 ? TrendingDown : TrendingUp}
      label="Today vs 7-day avg"
      value={`${sign}${m.todayVsAvgPct}%`}
      hint={`${m.clicksToday.toLocaleString()} today · ${Math.round(m.clicksAvg7d).toLocaleString()}/day avg`}
      tone={tone}
      highlight={dropping}
    />
  );
}

function DestinationsCard({ m }: { m: AlertMetrics }) {
  const tone = m.brokenDestinations > 0 ? "bad" : "good";
  return (
    <MetricTile
      Icon={Link2}
      label="Destinations health"
      value={m.brokenDestinations > 0 ? `${m.brokenDestinations} broken` : "All OK"}
      hint={
        m.brokenSamples.length > 0
          ? m.brokenSamples.map((s) => `${s.slug} (${s.status})`).join(" · ")
          : `${m.linksActive} active links · last 15 probed`
      }
      tone={tone}
      highlight={m.brokenDestinations > 0}
    />
  );
}

function ClickSpamCard({ m }: { m: AlertMetrics }) {
  const tone = m.topIpLastHour && m.topIpLastHour.count >= 30 ? "bad" : "good";
  return (
    <MetricTile
      Icon={ShieldAlert}
      label="Top IP, last hour"
      value={
        m.topIpLastHour
          ? `${m.topIpLastHour.count} hits`
          : "Quiet"
      }
      hint={m.topIpLastHour ? m.topIpLastHour.ip : "No clicks in last 60 min"}
      tone={tone}
      highlight={tone === "bad"}
    />
  );
}

// ── Tier 2 ──────────────────────────────────────────────────────────

function TrafficSpikeCard({ m }: { m: AlertMetrics }) {
  const ratio = m.spikeRatio;
  const tone = ratio >= 3 ? "good" : ratio >= 1.5 ? "info" : "neutral";
  return (
    <MetricTile
      Icon={Rocket}
      label="Last hour pace"
      value={ratio > 0 ? `${ratio.toFixed(1)}×` : "—"}
      hint={`${m.clicksLastHour} clicks last hour · ${Math.round(m.hourAvg24h)}/h avg`}
      tone={tone}
      highlight={ratio >= 3}
    />
  );
}

function ABTestCard({ m }: { m: AlertMetrics }) {
  const tone = m.abRecentWinners > 0 ? "good" : m.abRunning > 0 ? "info" : "neutral";
  return (
    <MetricTile
      Icon={Trophy}
      label="A/B testing"
      value={`${m.abRunning} running`}
      hint={
        m.abRecentWinners > 0
          ? `${m.abRecentWinners} winner${m.abRecentWinners === 1 ? "" : "s"} confirmed in last 24h`
          : m.abRunning === 0
            ? "Start your first test to find conversion lifts"
            : "Tests collecting data — winner needs enough conversions"
      }
      tone={tone}
      highlight={m.abRecentWinners > 0}
    />
  );
}

function PeakHourCard({ m }: { m: AlertMetrics }) {
  const shifted = m.peakHourNow !== null && m.peakHourBefore !== null && Math.abs(m.peakHourNow - m.peakHourBefore) >= 2;
  const tone = shifted ? "info" : "neutral";
  return (
    <MetricTile
      Icon={Clock}
      label="Peak hour (7d)"
      value={m.peakHourNow !== null ? `${m.peakHourNow}:00` : "—"}
      hint={
        m.peakHourBefore !== null && m.peakHourNow !== null
          ? `Was ${m.peakHourBefore}:00 in days 8–30 ${shifted ? "· shifted" : ""}`
          : "Not enough click history yet"
      }
      tone={tone}
      highlight={shifted}
    />
  );
}

function TodayVsAvgCard({ m }: { m: AlertMetrics }) {
  // Different framing from ClickDropCard — this one emphasises spike (positive)
  const tone = m.todayVsAvgPct >= 30 ? "good" : m.todayVsAvgPct <= -30 ? "bad" : "neutral";
  return (
    <MetricTile
      Icon={m.todayVsAvgPct >= 0 ? TrendingUp : TrendingDown}
      label="Clicks today"
      value={m.clicksToday.toLocaleString()}
      hint={`Hour avg ${Math.round(m.hourAvg24h)} · month ${m.clicksThisMonth.toLocaleString()}`}
      tone={tone}
    />
  );
}

// ── Tier 3 + 4 ──────────────────────────────────────────────────────

function CountryCard({ m }: { m: AlertMetrics }) {
  const shifted = m.topCountryNow !== null && m.topCountryBefore !== null && m.topCountryNow !== m.topCountryBefore;
  return (
    <MetricTile
      Icon={Globe}
      label="Top country (7d)"
      value={m.topCountryNow ?? "—"}
      hint={
        m.topCountryNow
          ? `${Math.round(m.topCountryNowShare * 100)}% of traffic ${shifted ? `· was ${m.topCountryBefore}` : ""}`
          : "No geo data yet"
      }
      tone={shifted ? "warn" : "neutral"}
      highlight={shifted}
    />
  );
}

function DeviceCard({ m }: { m: AlertMetrics }) {
  const delta = m.mobileShareNow - m.mobileShareBefore;
  const shifted = Math.abs(delta) >= 0.2;
  return (
    <MetricTile
      Icon={Smartphone}
      label="Mobile share (7d)"
      value={m.mobileShareNow > 0 ? `${Math.round(m.mobileShareNow * 100)}%` : "—"}
      hint={
        m.mobileShareBefore > 0
          ? `Was ${Math.round(m.mobileShareBefore * 100)}% ${shifted ? `· ${delta > 0 ? "+" : ""}${Math.round(delta * 100)} pts` : ""}`
          : "Not enough history yet"
      }
      tone={shifted ? "warn" : "neutral"}
      highlight={shifted}
    />
  );
}

function StaleLinksCard({ m }: { m: AlertMetrics }) {
  const tone = m.linksStale >= 10 ? "warn" : "neutral";
  return (
    <MetricTile
      Icon={Trash2}
      label="Stale links (30d)"
      value={`${m.linksStale}`}
      hint={`${m.linksActive} active · zero clicks in 30 days`}
      tone={tone}
      highlight={m.linksStale >= 10}
    />
  );
}

function SubscriptionCard({ m }: { m: AlertMetrics }) {
  const expiringSoon = m.subDaysLeft !== null && m.subDaysLeft <= 3 && m.subDaysLeft >= 0;
  const tone = expiringSoon ? "bad" : m.subStatus === "active" ? "good" : "neutral";
  return (
    <MetricTile
      Icon={m.subStatus === "active" ? CreditCard : AlertCircle}
      label="Subscription"
      value={
        m.subStatus === "active" && m.subDaysLeft !== null
          ? `${m.subDaysLeft}d left`
          : m.subStatus === "none"
            ? "Free plan"
            : m.subStatus
      }
      hint={
        m.subPlan
          ? `${m.subPlan} · ${m.subStatus}`
          : "No paid subscription on file"
      }
      tone={tone}
      highlight={expiringSoon}
    />
  );
}
