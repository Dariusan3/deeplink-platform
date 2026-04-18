"use client";

import { useState, useMemo } from "react";
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
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Download,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

type TimeRange = "7d" | "14d" | "30d" | "90d" | "all" | "custom";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { collections } = useCollections();
  const { links } = useLinks();
  const { dailyClicks, geoData, deviceData, browserData, hourlyData, referrerData, topLinks, totalClicks, loading } =
    useAnalytics(timeRange === "custom" ? "all" : timeRange, selectedCollection);

  const ranges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "14d", label: "14D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "all", label: "All" },
  ];

  // Compute extra stats from the data
  const extraStats = useMemo(() => {
    const activeLinks = links.filter((l) => l.is_active).length;
    const topReferrer = referrerData.length > 0 ? referrerData[0].domain : "—";
    const topLocation = geoData.length > 0 ? geoData[0].country : "—";

    // Unique clicks estimate (by unique days with clicks as proxy)
    const daysWithClicks = dailyClicks.filter((d) => d.count > 0).length;
    const totalDays = dailyClicks.length || 1;
    const avgClicksPerDay = totalClicks / totalDays;

    // Trend: compare last half vs first half of period
    const halfPoint = Math.floor(dailyClicks.length / 2);
    const firstHalf = dailyClicks.slice(0, halfPoint).reduce((s, d) => s + d.count, 0);
    const secondHalf = dailyClicks.slice(halfPoint).reduce((s, d) => s + d.count, 0);
    const trendPercent = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    const isGrowing = trendPercent > 0;

    // Growing/declining links
    // Links with more recent clicks are "growing"
    const growingLinks = topLinks.filter((l) => l.count > avgClicksPerDay).length;
    const decliningLinks = topLinks.filter((l) => l.count > 0 && l.count < avgClicksPerDay).length;

    // Health score (0-100)
    const healthFactors = [
      activeLinks > 0 ? 30 : 0,
      totalClicks > 0 ? 25 : 0,
      trendPercent >= 0 ? 20 : 10,
      referrerData.length > 1 ? 15 : referrerData.length > 0 ? 8 : 0,
      geoData.length > 1 ? 10 : geoData.length > 0 ? 5 : 0,
    ];
    const healthScore = healthFactors.reduce((s, v) => s + v, 0);
    const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Work";
    const healthColor = healthScore >= 80 ? "text-[#00D26A]" : healthScore >= 60 ? "text-blue-400" : healthScore >= 40 ? "text-amber-400" : "text-red-400";

    return {
      activeLinks,
      topReferrer,
      topLocation,
      avgClicksPerDay,
      trendPercent,
      isGrowing,
      growingLinks,
      decliningLinks,
      healthScore,
      healthLabel,
      healthColor,
      clicksPerLink: activeLinks > 0 ? totalClicks / activeLinks : 0,
      totalLinks: links.length,
    };
  }, [links, dailyClicks, geoData, referrerData, topLinks, totalClicks]);

  // Previous period comparison
  const previousPeriodClicks = useMemo(() => {
    const halfPoint = Math.floor(dailyClicks.length / 2);
    return dailyClicks.slice(0, halfPoint).reduce((s, d) => s + d.count, 0);
  }, [dailyClicks]);

  const currentPeriodClicks = useMemo(() => {
    const halfPoint = Math.floor(dailyClicks.length / 2);
    return dailyClicks.slice(halfPoint).reduce((s, d) => s + d.count, 0);
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
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Analytics
            </h2>
            <p className="text-sm text-neutral-400">
              Track your link performance and visitor analytics in real-time
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-9 w-9 rounded-xl bg-white/[0.03] border border-white/5 text-neutral-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            {/* Collection filter */}
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

            {/* Time range */}
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
                  <p className="text-[10px] text-neutral-500 mt-1">{totalClicks.toLocaleString()} total</p>
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

            {/* Link Performance + Traffic Trends — like competitor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Link Performance */}
              <Card className="glass-card border-white/5">
                <CardContent className="p-6">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
                    <Heart className="w-4 h-4 text-[#00D26A]" />
                    Link Performance
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Health Score */}
                    <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="relative w-16 h-16 mb-2">
                        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="rgba(255,255,255,0.05)"
                            strokeWidth="3"
                          />
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={extraStats.healthScore >= 80 ? "#00D26A" : extraStats.healthScore >= 60 ? "#3b82f6" : extraStats.healthScore >= 40 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="3"
                            strokeDasharray={`${extraStats.healthScore}, 100`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-white">
                          {extraStats.healthScore}
                        </span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Health</span>
                      <span className={cn("text-[10px] font-black", extraStats.healthColor)}>{extraStats.healthLabel}</span>
                    </div>

                    {/* Active / Growing / Declining / Trend */}
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                        <p className="text-xl font-black text-white">{extraStats.activeLinks}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Active Links</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                        <p className="text-xl font-black text-[#00D26A]">{extraStats.growingLinks}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Growing</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                        <p className="text-xl font-black text-red-400">{extraStats.decliningLinks}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Declining</p>
                      </div>
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {extraStats.isGrowing ? (
                            <TrendingUp className="w-4 h-4 text-[#00D26A]" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <p className={cn("text-lg font-black", extraStats.isGrowing ? "text-[#00D26A]" : "text-red-400")}>
                            {extraStats.trendPercent >= 0 ? "+" : ""}{extraStats.trendPercent.toFixed(0)}%
                          </p>
                        </div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Overall Trend</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Traffic Trends */}
              <Card className="glass-card border-white/5">
                <CardContent className="p-6">
                  <h3 className="text-sm font-black text-white flex items-center gap-2 mb-5">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Traffic Trends
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{currentPeriodClicks.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Current Period</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-neutral-400">{previousPeriodClicks.toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Previous Period</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{extraStats.clicksPerLink.toFixed(1)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Clicks / Link</p>
                    </div>
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                      <p className="text-2xl font-black text-white">{extraStats.totalLinks}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Total Links</p>
                    </div>
                  </div>

                  {/* Daily average with trend */}
                  <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                    <ArrowRight className="w-5 h-5 text-neutral-500 shrink-0" />
                    <div>
                      <p className="text-2xl font-black text-white">
                        {extraStats.avgClicksPerDay.toFixed(1)} <span className="text-sm text-neutral-500 font-bold">clicks/day</span>
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold",
                        extraStats.trendPercent > 0 ? "text-[#00D26A]" : extraStats.trendPercent < 0 ? "text-red-400" : "text-neutral-500"
                      )}>
                        {extraStats.trendPercent >= 0 ? "+" : ""}{extraStats.trendPercent.toFixed(0)}% {extraStats.trendPercent >= 0 ? "Growing" : "Declining"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clicks over time chart */}
            <ClicksChart data={dailyClicks} totalClicks={totalClicks} />

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

            {/* AI Weekly Intelligence Report */}
            <WeeklyReport analyticsData={{
              totalClicks,
              topLinks: topLinks.slice(0, 5),
              topCountries: geoData.slice(0, 5),
              deviceSplit: deviceData,
              topReferrers: referrerData.slice(0, 5),
              dailyTrend: dailyClicks.slice(-7),
            }} />
          </>
        )}
      </div>
    </>
  );
}
