"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { useAnalytics } from "@/hooks/use-analytics";
import { useCollections } from "@/hooks/use-collections";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { TopLinks } from "@/components/analytics/top-links";
import { GeoBreakdown } from "@/components/analytics/geo-breakdown";
import { DeviceBreakdown } from "@/components/analytics/device-breakdown";
import { ReferrerSources } from "@/components/analytics/referrer-sources";
import { WeeklyReport } from "@/components/analytics/weekly-report";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";

type TimeRange = "7d" | "14d" | "30d" | "90d" | "all";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const { collections } = useCollections();
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks, loading } =
    useAnalytics(timeRange, selectedCollection);

  const ranges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "14d", label: "14 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "all", label: "All Time" },
  ];

  return (
    <>
      <Header title="Deep Analytics" />
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header with time range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Statistics
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              {selectedCollection
                ? `Collection: ${collections.find((c) => c.id === selectedCollection)?.name || "Unknown"}`
                : "Comprehensive Link Performance Data"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Collection filter */}
            <div className="relative">
              <select
                value={selectedCollection || ""}
                onChange={(e) => setSelectedCollection(e.target.value || null)}
                className="h-8 pl-8 pr-3 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] font-black uppercase tracking-widest text-neutral-400 focus:outline-none focus:border-[#00D26A]/30 appearance-none cursor-pointer [&>option]:bg-black [&>option]:text-white"
              >
                <option value="">All Links</option>
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
              <FolderOpen className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Time range */}
            <div className="flex gap-1 bg-white/[0.02] border border-white/5 rounded-xl p-1">
              {ranges.map((r) => (
                <Button
                  key={r.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTimeRange(r.value)}
                  className={cn(
                    "h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    timeRange === r.value
                      ? "bg-[#00D26A]/10 text-[#00D26A]"
                      : "text-neutral-500 hover:text-white hover:bg-white/[0.03]"
                  )}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Clicks over time chart */}
            <ClicksChart data={dailyClicks} totalClicks={totalClicks} />

            {/* 3-column grid: Top Links, Geo, Device */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TopLinks data={topLinks} />
              <GeoBreakdown data={geoData} totalClicks={totalClicks} />
              <DeviceBreakdown data={deviceData} totalClicks={totalClicks} />
            </div>

            {/* Referrer sources */}
            <ReferrerSources data={referrerData} />

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
