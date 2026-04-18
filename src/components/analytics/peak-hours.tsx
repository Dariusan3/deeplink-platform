"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HourlyData } from "@/hooks/use-analytics";

function formatHour(h: number): string {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
}

export function PeakHours({ data }: { data: HourlyData[] }) {
  const maxCount = useMemo(() => Math.max(...data.map((d) => d.count), 1), [data]);
  const peakHour = useMemo(() => {
    const peak = data.reduce((max, d) => (d.count > max.count ? d : max), { hour: 0, count: 0 });
    return peak;
  }, [data]);
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Peak Traffic Hours
          </CardTitle>
          {hasData && (
            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Peak: {formatHour(peakHour.hour)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-500">No traffic data</p>
            <p className="text-xs text-neutral-600">Traffic patterns will appear once you have clicks.</p>
          </div>
        ) : (
          <div>
            {/* Bar chart — 24 hours */}
            <div className="flex items-end gap-[3px] h-32">
              {data.map((d) => {
                const pct = (d.count / maxCount) * 100;
                const isPeak = d.hour === peakHour.hour;
                return (
                  <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        isPeak ? "bg-amber-400" : "bg-[#00D26A]/40 group-hover:bg-[#00D26A]/70"
                      )}
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                    {/* Tooltip on hover */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                      <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white whitespace-nowrap">
                        {formatHour(d.hour)}: {d.count} clicks
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Hour labels */}
            <div className="flex gap-[3px] mt-1">
              {data.map((d) => (
                <div key={d.hour} className="flex-1 text-center">
                  {d.hour % 6 === 0 && (
                    <span className="text-[8px] text-neutral-600 font-bold">{formatHour(d.hour)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
