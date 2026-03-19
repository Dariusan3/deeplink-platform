"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, TrendingDown, TrendingUp, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLinks } from "@/hooks/use-links";
import { createClient } from "@/lib/supabase/client";

interface Anomaly {
  detected: boolean;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affectedLink?: string;
  changePercent?: number;
}

export function AnomalyAlert() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const { links } = useLinks();
  const supabase = createClient();

  const checkAnomalies = useCallback(async () => {
    if (links.length === 0) { setLoading(false); return; }

    const linkIds = links.map((l) => l.id);
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    try {
      // Recent 2h clicks
      const { count: recentClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .in("link_id", linkIds)
        .gte("clicked_at", twoHoursAgo.toISOString());

      // Previous 2h clicks
      const { count: prevClicks } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .in("link_id", linkIds)
        .gte("clicked_at", fourHoursAgo.toISOString())
        .lt("clicked_at", twoHoursAgo.toISOString());

      const res = await fetch("/api/ai/anomaly-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentHours: recentClicks ?? 0,
          previousHours: prevClicks ?? 0,
          topLinks: links.slice(0, 3).map((l) => ({
            slug: l.slug,
            title: l.title,
            recentClicks: 0,
            avgClicks: 2,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [links, supabase]);

  useEffect(() => {
    checkAnomalies();
  }, [checkAnomalies]);

  const visibleAnomalies = anomalies.filter((_, i) => !dismissed.has(i));

  if (loading || visibleAnomalies.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleAnomalies.map((anomaly, i) => (
        <div
          key={i}
          className={cn(
            "relative rounded-xl border p-4 flex items-start gap-3",
            anomaly.severity === "high"
              ? "border-red-500/20 bg-red-500/5"
              : anomaly.severity === "medium"
              ? "border-amber-500/20 bg-amber-500/5"
              : "border-white/10 bg-white/[0.02]"
          )}
        >
          <div
            className={cn(
              "p-1.5 rounded-lg shrink-0",
              anomaly.severity === "high"
                ? "bg-red-500/10 text-red-400"
                : anomaly.severity === "medium"
                ? "bg-amber-500/10 text-amber-400"
                : "bg-white/5 text-neutral-400"
            )}
          >
            {anomaly.changePercent !== undefined && anomaly.changePercent < 0 ? (
              <TrendingDown className="w-4 h-4" />
            ) : anomaly.changePercent !== undefined ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                  anomaly.severity === "high"
                    ? "bg-red-500/20 text-red-400"
                    : anomaly.severity === "medium"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/10 text-neutral-400"
                )}
              >
                {anomaly.severity} alert
              </span>
              <Sparkles className="w-3 h-3 text-[#00D26A]" />
              <span className="text-[9px] text-neutral-500">AI Detected</span>
            </div>
            <p className="text-sm font-bold text-white">{anomaly.title}</p>
            <p className="text-xs text-neutral-400 mt-0.5 whitespace-pre-line leading-relaxed">
              {anomaly.description}
            </p>
          </div>
          <button
            onClick={() => setDismissed((prev) => new Set([...prev, i]))}
            className="text-neutral-600 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
