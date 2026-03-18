"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { useAnalytics } from "@/hooks/use-analytics";
import { ClicksChart } from "@/components/analytics/clicks-chart";
import { TopLinks } from "@/components/analytics/top-links";
import { GeoBreakdown } from "@/components/analytics/geo-breakdown";
import { DeviceBreakdown } from "@/components/analytics/device-breakdown";
import { ReferrerSources } from "@/components/analytics/referrer-sources";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TimeRange = "7d" | "14d" | "30d" | "90d";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const { dailyClicks, geoData, deviceData, referrerData, topLinks, totalClicks, loading } =
    useAnalytics(timeRange);

  const ranges: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "14d", label: "14 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
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
              Comprehensive Link Performance Data
            </p>
          </div>
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
          </>
        )}
      </div>
    </>
  );
}
