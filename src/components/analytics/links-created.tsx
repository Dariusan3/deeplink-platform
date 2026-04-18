"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import type { Link } from "@/types/links";

export function LinksCreated({ links }: { links: Link[] }) {
  // Group links by creation date (last 14 days)
  const dailyCreated = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      const count = links.filter((l) => l.created_at.split("T")[0] === ds).length;
      result.push({ date: ds, count });
    }
    return result;
  }, [links]);

  const maxCount = Math.max(...dailyCreated.map((d) => d.count), 1);
  const totalCreated = dailyCreated.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="glass-card border-white/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Link2 className="w-4 h-4 text-[#00D26A]" />
            Links Created
          </CardTitle>
          <span className="text-[10px] font-bold text-neutral-500">
            {totalCreated} in last 14 days
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mini bar chart */}
        <div className="flex items-end gap-1 h-24">
          {dailyCreated.map((d) => {
            const pct = (d.count / maxCount) * 100;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className="w-full rounded-t bg-[#00D26A]/30 group-hover:bg-[#00D26A]/60 transition-all"
                  style={{ height: `${d.count > 0 ? Math.max(pct, 8) : 3}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-black/90 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-bold text-white whitespace-nowrap">
                    {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {d.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Date labels */}
        <div className="flex gap-1 mt-1">
          {dailyCreated.map((d, i) => (
            <div key={d.date} className="flex-1 text-center">
              {(i === 0 || i === 6 || i === 13) && (
                <span className="text-[8px] text-neutral-600 font-bold">
                  {new Date(d.date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
