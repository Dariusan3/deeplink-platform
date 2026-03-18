"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Tablet, Monitor, HelpCircle } from "lucide-react";
import { DeviceData } from "@/hooks/use-analytics";

interface DeviceBreakdownProps {
  data: DeviceData[];
  totalClicks: number;
}

const deviceConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  mobile: { icon: <Smartphone className="w-4 h-4" />, color: "#00D26A", label: "Mobile" },
  tablet: { icon: <Tablet className="w-4 h-4" />, color: "#3B82F6", label: "Tablet" },
  desktop: { icon: <Monitor className="w-4 h-4" />, color: "#F59E0B", label: "Desktop" },
  unknown: { icon: <HelpCircle className="w-4 h-4" />, color: "#6B7280", label: "Unknown" },
};

export function DeviceBreakdown({ data, totalClicks }: DeviceBreakdownProps) {
  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/20" />
      <CardHeader className="pt-6 px-6 pb-3">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5" />
          Device Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {data.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-6">No data yet</p>
        ) : (
          <div className="space-y-4">
            {data.map((d) => {
              const config = deviceConfig[d.device_type] || deviceConfig.unknown;
              const pct = totalClicks > 0 ? Math.round((d.count / totalClicks) * 100) : 0;
              return (
                <div key={d.device_type} className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${config.color}15`, color: config.color }}
                  >
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white">{config.label}</span>
                      <span className="text-xs font-black" style={{ color: config.color }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: config.color }}
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
