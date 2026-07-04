"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { GeoData } from "@/hooks/use-analytics";

interface GeoBreakdownProps {
  data: GeoData[];
  totalClicks: number;
}

function countryToFlag(code: string): string {
  if (!code || code.length !== 2 || code === "Unknown") return "🌐";
  return String.fromCodePoint(
    ...([...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
  );
}

export function GeoBreakdown({ data, totalClicks }: GeoBreakdownProps) {
  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/20" />
      <CardHeader className="pt-6 px-6 pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          Geographic Reach
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {data.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-6">No data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((geo) => {
              const pct = totalClicks > 0 ? Math.round((geo.count / totalClicks) * 100) : 0;
              return (
                <div key={geo.country} className="flex items-center gap-3">
                  <span className="text-base shrink-0">{countryToFlag(geo.country)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{geo.country}</span>
                      <span className="text-[10px] font-black text-neutral-400">{pct}% · {geo.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00D26A]/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
