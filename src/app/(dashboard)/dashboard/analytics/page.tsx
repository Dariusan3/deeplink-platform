"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCollections } from "@/hooks/use-collections";
import { useLinks } from "@/hooks/use-links";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { TopLinks } from "@/components/analytics/top-links";
import { GeoBreakdown } from "@/components/analytics/geo-breakdown";
import { DeviceBreakdown } from "@/components/analytics/device-breakdown";
import { ReferrerSources } from "@/components/analytics/referrer-sources";
import { BrowserBreakdown } from "@/components/analytics/browser-breakdown";
import { PeakHours } from "@/components/analytics/peak-hours";
import { LinksCreated } from "@/components/analytics/links-created";
import { WeeklyReport } from "@/components/analytics/weekly-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  MousePointerClick,
  Users,
  Globe,
  Link2,
  Activity,
  Download,
  RefreshCw,
  X,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-picker";

type TimeRange = "7d" | "14d" | "30d" | "90d" | "all" | "custom";

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // When arriving from a link's "Analytics" action the URL carries ?linkId=…
  // — scope the whole page to that one link instead of the whole team.
  const linkId = searchParams.get("linkId");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { collections } = useCollections();
  const { links } = useLinks();
  const focusedLink = linkId ? links.find((l) => l.id === linkId) : null;
  // Only pass the custom range to the hook once BOTH endpoints are picked,
  // otherwise the query window would be undefined.
  const customRangeReady = timeRange === "custom" && !!customFrom && !!customTo;
  const { dailyClicks, geoData, deviceData, browserData, hourlyData, referrerData, topLinks, totalClicks, loading } =
    useAnalytics(
      timeRange === "custom" ? "all" : timeRange,
      selectedCollection,
      customRangeReady ? { from: customFrom, to: customTo } : null,
      linkId
    );

  const ranges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "14d", label: "14D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "all", label: "All" },
    { value: "custom", label: "Custom" },
  ];

  // Human-readable descriptor of the active window, used as the scoping
  // subtitle on the Clicks stat so the big number reads as "X in <period>"
  // instead of repeating itself.
  const rangeLabel =
    timeRange === "all"
      ? "all time"
      : timeRange === "custom"
      ? "selected range"
      : { "7d": "last 7 days", "14d": "last 14 days", "30d": "last 30 days", "90d": "last 90 days" }[timeRange];

  // Compute extra stats from the data
  const extraStats = useMemo(() => {
    const activeLinks = links.filter((l) => l.is_active).length;
    const topReferrer = referrerData.length > 0 ? referrerData[0].domain : "—";
    const topLocation = geoData.length > 0 ? geoData[0].country : "—";

    const totalDays = dailyClicks.length || 1;
    const avgClicksPerDay = totalClicks / totalDays;

    // Trend: the recent half of the selected window vs the earlier half.
    const halfPoint = Math.floor(dailyClicks.length / 2);
    const firstHalf = dailyClicks.slice(0, halfPoint).reduce((s, d) => s + d.count, 0);
    const secondHalf = dailyClicks.slice(halfPoint).reduce((s, d) => s + d.count, 0);
    const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    const isGrowing = trendPercent > 0;

    // NOT growth: `topLinks` carries no time dimension — the RPC returns one
    // total per link for the window. These are simply links above or below the
    // mean. They were previously labelled "Growing" and "Declining", which made
    // a perfectly flat link read as declining purely for being below average.
    const aboveAvgLinks = topLinks.filter((l) => l.count > avgClicksPerDay).length;
    const belowAvgLinks = topLinks.filter((l) => l.count > 0 && l.count < avgClicksPerDay).length;

    return {
      activeLinks,
      topReferrer,
      topLocation,
      avgClicksPerDay,
      trendPercent,
      isGrowing,
      aboveAvgLinks,
      belowAvgLinks,
      clicksPerLink: activeLinks > 0 ? totalClicks / activeLinks : 0,
      totalLinks: links.length,
    };
  }, [links, dailyClicks, geoData, referrerData, topLinks, totalClicks]);

  // The two halves of the SELECTED window — not this window versus the one
  // before it. Labelled with their real day counts so "Prior 15 days" cannot be
  // misread as the 30 days preceding a 30-day selection.
  const halves = useMemo(() => {
    const halfPoint = Math.floor(dailyClicks.length / 2);
    return {
      earlierDays: halfPoint,
      recentDays: dailyClicks.length - halfPoint,
      earlierClicks: dailyClicks.slice(0, halfPoint).reduce((s, d) => s + d.count, 0),
      recentClicks: dailyClicks.slice(halfPoint).reduce((s, d) => s + d.count, 0),
    };
  }, [dailyClicks]);

  // Export handler
  const handleExport = () => {
    let csv = "Date,Clicks\n";
    for (const d of dailyClicks) {
      csv += `${d.date},${d.count}\n`;
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tappr-statistics-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <>
      <Header title="Deep Analytics" />
      <div className="p-4 md:p-6 space-y-6">
        {/* Toolbar — title lives in the sticky <Header> above, so this
            row only holds the filters/actions, right-aligned. */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Collection filter — hidden when scoped to a single link */}
            {!linkId && (
              <div className="relative">
                <select
                  value={selectedCollection || ""}
                  onChange={(e) => setSelectedCollection(e.target.value || null)}
                  className="h-9 pl-8 pr-3 rounded-xl bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-400 focus:outline-none focus:border-[#00D26A]/30 appearance-none cursor-pointer [&>option]:bg-black [&>option]:text-white"
                >
                  <option value="">All Links</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
                <FolderOpen className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            {/* Time range — when Custom is active we REPLACE the preset
                chips with the date-range picker so Export stays inline
                and the picker auto-opens on the first click. */}
            {timeRange === "custom" ? (
              <DateRangePicker
                from={customFrom}
                to={customTo}
                onChange={({ from, to }) => {
                  setCustomFrom(from);
                  setCustomTo(to);
                }}
                placeholder="Pick date range"
                defaultOpen
                className="w-[260px]"
              />
            ) : (
              <div className="flex gap-0.5 bg-white/[0.02] border border-white/5 rounded-xl p-1">
                {ranges.map((r) => (
                  <Button
                    key={r.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeRange(r.value)}
                    className={cn(
                      "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      timeRange === r.value
                        ? "bg-[#00D26A]/10 text-[#00D26A]"
                        : "text-neutral-500 hover:text-white hover:bg-white/[0.03]"
                    )}
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Export */}
            <Button
              onClick={handleExport}
              size="sm"
              className="h-9 px-4 rounded-xl bg-[#00D26A] hover:bg-[#00D26A]/90 text-black text-[10px] font-black uppercase tracking-widest gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export Statistics
            </Button>
          </div>
        </div>

        {/* Single-link scope banner */}
        {focusedLink && (
          <div className="flex items-center justify-between gap-4 glass-card bg-[#00D26A]/[0.04] border border-[#00D26A]/20 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link2 className="w-4 h-4 text-[#00D26A] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A]">
                  Single link analytics
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {focusedLink.title || "Untitled"}{" "}
                  <span className="text-neutral-500 font-medium">/{focusedLink.slug}</span>
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/analytics")}
              className="shrink-0 h-8 rounded-lg bg-white/[0.03] border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              View all links
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top Stats Row — like competitor */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20">
                      <MousePointerClick className="w-5 h-5 text-[#00D26A]" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Clicks</span>
                  </div>
                  <p className="text-3xl font-black text-white">{totalClicks.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">in {rangeLabel}</p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Avg / Day</span>
                  </div>
                  <p className="text-3xl font-black text-white">{extraStats.avgClicksPerDay.toFixed(1)}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {extraStats.isGrowing ? (
                      <span className="text-[#00D26A]">+{extraStats.trendPercent.toFixed(0)}% Trending Up</span>
                    ) : extraStats.trendPercent < 0 ? (
                      <span className="text-red-400">{extraStats.trendPercent.toFixed(0)}% Declining</span>
                    ) : (
                      <span>Stable</span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <Globe className="w-5 h-5 text-purple-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Top Referrer</span>
                  </div>
                  <p className="text-lg font-black text-white truncate">{extraStats.topReferrer}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {referrerData.length > 0 ? `${referrerData[0].count} clicks` : "No data"}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <Globe className="w-5 h-5 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Top Location</span>
                  </div>
                  <p className="text-lg font-black text-white truncate">{extraStats.topLocation}</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {geoData.length > 0 ? `${geoData[0].count} clicks` : "No data"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* AI Weekly Intelligence Report — surfaced near the top so the
                headline insights are visible without scrolling to the bottom. */}
            <WeeklyReport analyticsData={{
              totalClicks,
              topLinks: topLinks.slice(0, 5),
              topCountries: geoData.slice(0, 5),
              deviceSplit: deviceData,
              topReferrers: referrerData.slice(0, 5),
              dailyTrend: dailyClicks.slice(-7),
            }} />

            {/* The main time series comes before the derived metrics below it —
                it is what the page exists to show. */}
            <ClicksChart data={dailyClicks} totalClicks={totalClicks} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Link Performance. The Health Score ring that used to lead this
                  card was dropped: it scored 30 for having an active link, 25
                  for having any clicks, 20 for a non-negative trend, 15 for more
                  than one referrer and 10 for more than one country — so every
                  account with real traffic read 90 or 100 and it never moved. */}
              <Card className="glass-card border-white/5">
                <CardContent className="p-6">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
                    <Link2 className="w-4 h-4 text-[#00D26A]" />
                    Link Performance
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{extraStats.activeLinks}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Active Links</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{extraStats.totalLinks}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Total Links</p>
                    </div>
                    {/* Named for what they measure. These were "Growing" and
                        "Declining", but topLinks has no time dimension — a link
                        with flat traffic was counted as declining purely for
                        sitting below the mean. */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-[#00D26A]">{extraStats.aboveAvgLinks}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Above Average</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-neutral-400">{extraStats.belowAvgLinks}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Below Average</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-neutral-600">
                    Above / below the {extraStats.avgClicksPerDay.toFixed(1)} clicks-per-day average, across your top links.
                  </p>
                </CardContent>
              </Card>

              {/* Traffic Trends */}
              <Card className="glass-card border-white/5">
                <CardContent className="p-6">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Traffic Trends
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* These two are the halves of the SELECTED window, so they
                        say so. They used to read "Current Period" / "Previous
                        Period", which implied the window before this one. */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{halves.recentClicks.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                        Last {halves.recentDays}d
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-neutral-400">{halves.earlierClicks.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                        Prior {halves.earlierDays}d
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{extraStats.clicksPerLink.toFixed(1)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Clicks / Link</p>
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-neutral-600">
                    Both halves of the selected range — not this range versus the one before it.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 3-column grid: Top Links, Geo, Device */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TopLinks data={topLinks} />
              <GeoBreakdown data={geoData} totalClicks={totalClicks} />
              <DeviceBreakdown data={deviceData} totalClicks={totalClicks} />
            </div>

            {/* Browsers + Referrers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BrowserBreakdown data={browserData} totalClicks={totalClicks} />
              <ReferrerSources data={referrerData} />
            </div>

            {/* Peak Hours + Links Created */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PeakHours data={hourlyData} />
              <LinksCreated links={links} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  );
}
