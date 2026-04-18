"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BrowserData } from "@/hooks/use-analytics";

const BROWSER_COLORS: Record<string, string> = {
  Chrome: "bg-blue-500",
  Safari: "bg-sky-400",
  Firefox: "bg-orange-500",
  Edge: "bg-cyan-500",
  Instagram: "bg-pink-500",
  Facebook: "bg-blue-600",
  "Google App": "bg-red-400",
  Opera: "bg-red-600",
  "Twitter/X": "bg-neutral-400",
  TikTok: "bg-pink-400",
  Snapchat: "bg-yellow-400",
  Other: "bg-neutral-600",
};

export function BrowserBreakdown({ data, totalClicks }: { data: BrowserData[]; totalClicks: number }) {
  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-black flex items-center gap-2">
          <Monitor className="w-4 h-4 text-blue-400" />
          Browsers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-neutral-500">No browser data</p>
            <p className="text-xs text-neutral-600">Browser information will appear here once you have clicks.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 8).map((item) => {
              const pct = totalClicks > 0 ? (item.count / totalClicks) * 100 : 0;
              const color = BROWSER_COLORS[item.browser] || BROWSER_COLORS.Other;
              return (
                <div key={item.browser}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-neutral-300">{item.browser}</span>
                    <span className="text-neutral-500">{item.count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.max(pct, 2)}%` }} />
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
