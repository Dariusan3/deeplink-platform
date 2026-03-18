"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface DailyCount {
  date: string;
  count: number;
}

interface ClickChartProps {
  dailyCounts: DailyCount[];
  loading?: boolean;
}

export function ClickChart({ dailyCounts, loading }: ClickChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#00D26A]" />
          Recent Clicks
        </CardTitle>
        <p className="text-sm text-neutral-500 font-medium">
          Click activity over the last 14 days
        </p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-48 flex flex-col justify-between text-[10px] font-bold text-neutral-600 -ml-1">
              <span>{maxCount}</span>
              <span>{Math.round(maxCount / 2)}</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-8">
              {/* Grid lines */}
              <div className="absolute left-8 right-0 top-0 h-48">
                <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/5" />
                <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" />
              </div>

              {/* Bars */}
              <div className="flex items-end gap-1.5 h-48 relative z-10">
                {dailyCounts.map((day, i) => {
                  const heightPercent = (day.count / maxCount) * 100;
                  const isHovered = hoveredIndex === i;
                  const isToday = i === dailyCounts.length - 1;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center justify-end h-full relative group"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white whitespace-nowrap z-20 shadow-lg">
                          <span className="text-[#00D26A]">{day.count}</span>{" "}
                          click{day.count !== 1 ? "s" : ""} ·{" "}
                          {formatDate(day.date)}
                        </div>
                      )}

                      {/* Bar */}
                      <div
                        className="w-full rounded-t-md transition-all duration-300 cursor-pointer min-h-[2px]"
                        style={{
                          height: `${Math.max(heightPercent, 1)}%`,
                          background: isHovered
                            ? "#00D26A"
                            : isToday
                              ? "linear-gradient(to top, rgba(0,210,106,0.6), rgba(0,210,106,0.9))"
                              : "linear-gradient(to top, rgba(0,210,106,0.15), rgba(0,210,106,0.4))",
                          boxShadow: isHovered
                            ? "0 0 15px rgba(0,210,106,0.3)"
                            : "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex gap-1.5 mt-3">
                {dailyCounts.map((day, i) => (
                  <div
                    key={day.date}
                    className="flex-1 text-center text-[9px] font-bold text-neutral-600 truncate"
                  >
                    {i % 2 === 0 || i === dailyCounts.length - 1
                      ? formatDate(day.date)
                      : ""}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
