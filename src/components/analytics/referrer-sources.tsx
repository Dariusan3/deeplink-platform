"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { ReferrerData } from "@/hooks/use-analytics";

interface ReferrerSourcesProps {
  data: ReferrerData[];
}

export function ReferrerSources({ data }: ReferrerSourcesProps) {
  const maxCount = data.length > 0 ? data[0].count : 1;

  return (
    <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#00D26A]/20" />
      <CardHeader className="pt-6 px-6 pb-3">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5" />
          Traffic Sources
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {data.length === 0 ? (
          <p className="text-sm text-neutral-600 text-center py-6">No data yet</p>
        ) : (
          <div className="space-y-3">
            {data.map((ref) => (
              <div key={ref.domain} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white truncate">{ref.domain}</span>
                    <span className="text-xs font-black text-[#00D26A] shrink-0 ml-2">{ref.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00D26A]/60 transition-all"
                      style={{ width: `${(ref.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
