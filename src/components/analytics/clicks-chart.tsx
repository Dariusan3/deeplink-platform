"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { DailyClickData } from "@/hooks/use-analytics";

interface ClicksChartProps {
  data: DailyClickData[];
  totalClicks: number;
}

export function ClicksChart({ data, totalClicks }: ClicksChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Show every Nth label to avoid crowding
  const labelInterval = data.length > 14 ? Math.ceil(data.length / 10) : 2;

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
      <CardHeader className="pt-8 px-8 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#00D26A]" />
            Clicks Over Time
          </CardTitle>
          <span className="text-2xl font-black text-white">{totalClicks}</span>
        </div>
        <p className="text-sm text-neutral-500 font-medium">Total clicks in selected period</p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="relative ml-8">
          {/* Grid lines */}
          <div className="absolute inset-0 h-56">
            <div className="absolute top-0 left-0 right-0 h-px bg-white/5" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/5" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/5" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/5" />
          </div>

          {/* Y labels */}
          <div className="absolute -left-8 top-0 h-56 flex flex-col justify-between text-[10px] font-bold text-neutral-600">
            <span>{maxCount}</span>
            <span>{Math.round((maxCount * 2) / 3)}</span>
            <span>{Math.round(maxCount / 3)}</span>
            <span>0</span>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-[2px] h-56 relative z-10">
            {data.map((day, i) => {
              const heightPercent = (day.count / maxCount) * 100;
              const isHovered = hoveredIndex === i;

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center justify-end h-full relative"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {isHovered && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white whitespace-nowrap z-20 shadow-lg">
                      <span className="text-[#00D26A]">{day.count}</span> · {formatDate(day.date)}
                    </div>
                  )}
                  <div
                    className="w-full rounded-t-sm transition-all duration-200 cursor-pointer min-h-[1px]"
                    style={{
                      height: `${Math.max(heightPercent, 0.5)}%`,
                      background: isHovered
                        ? "#00D26A"
                        : "linear-gradient(to top, rgba(0,210,106,0.2), rgba(0,210,106,0.5))",
                      boxShadow: isHovered ? "0 0 12px rgba(0,210,106,0.3)" : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* X labels */}
          <div className="flex gap-[2px] mt-3">
            {data.map((day, i) => (
              <div key={day.date} className="flex-1 text-center text-[8px] font-bold text-neutral-600 truncate">
                {i % labelInterval === 0 || i === data.length - 1 ? formatDate(day.date) : ""}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
