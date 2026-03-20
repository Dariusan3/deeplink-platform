"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { Target, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface GoalStatus {
  type: "link" | "collection";
  name: string;
  goal: number;
  period: string;
  current: number;
  met: boolean;
}

export function GoalTracker() {
  const { links } = useLinks();
  const { collections } = useCollections();
  const supabase = useMemo(() => createClient(), []);
  const [statuses, setStatuses] = useState<GoalStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const getPeriodStart = useCallback((period: string) => {
    const now = new Date();
    if (period === "daily") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }
    if (period === "weekly") {
      const day = now.getDay();
      const diff = now.getDate() - day;
      return new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
    }
    // monthly
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const checkGoals = useCallback(async () => {
    const linksWithGoals = links.filter((l) => l.click_goal && l.click_goal > 0);
    const collectionsWithGoals = collections.filter((c) => c.click_goal && c.click_goal > 0);

    if (linksWithGoals.length === 0 && collectionsWithGoals.length === 0) {
      setStatuses([]);
      setLoading(false);
      return;
    }

    const results: GoalStatus[] = [];

    // Check link goals
    for (const link of linksWithGoals) {
      const periodStart = getPeriodStart(link.click_goal_period || "daily");
      const { count } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", link.id)
        .gte("clicked_at", periodStart);

      const current = count ?? 0;
      results.push({
        type: "link",
        name: link.title || link.slug,
        goal: link.click_goal!,
        period: link.click_goal_period || "daily",
        current,
        met: current >= link.click_goal!,
      });
    }

    // Check collection goals
    for (const col of collectionsWithGoals) {
      const colLinks = links.filter((l) => l.collection_id === col.id);
      if (colLinks.length === 0) {
        results.push({
          type: "collection",
          name: col.name,
          goal: col.click_goal!,
          period: col.click_goal_period || "daily",
          current: 0,
          met: false,
        });
        continue;
      }

      const periodStart = getPeriodStart(col.click_goal_period || "daily");
      const linkIds = colLinks.map((l) => l.id);
      const { count } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .in("link_id", linkIds)
        .gte("clicked_at", periodStart);

      const current = count ?? 0;
      results.push({
        type: "collection",
        name: col.name,
        goal: col.click_goal!,
        period: col.click_goal_period || "daily",
        current,
        met: current >= col.click_goal!,
      });
    }

    setStatuses(results);
    setLoading(false);
  }, [links, collections, supabase, getPeriodStart]);

  useEffect(() => {
    checkGoals();
  }, [checkGoals]);

  if (loading || statuses.length === 0) return null;

  const behind = statuses.filter((s) => !s.met);
  const onTrack = statuses.filter((s) => s.met);

  return (
    <div className="space-y-2">
      {behind.map((status, i) => {
        const pct = Math.round((status.current / status.goal) * 100);
        return (
          <div
            key={`behind-${i}`}
            className="relative rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3"
          >
            <div className="p-1.5 rounded-lg shrink-0 bg-amber-500/10 text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                  behind goal
                </span>
                <span className="text-[9px] font-bold text-neutral-500 capitalize">{status.period}</span>
              </div>
              <p className="text-sm font-bold text-white">
                {status.type === "link" ? "Link" : "Collection"}: {status.name}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      pct < 30 ? "bg-red-500" : pct < 70 ? "bg-amber-400" : "bg-[#00D26A]"
                    )}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-neutral-400 shrink-0">
                  {status.current}/{status.goal}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {onTrack.length > 0 && (
        <div className="rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/5 p-4 flex items-center gap-3">
          <div className="p-1.5 rounded-lg shrink-0 bg-[#00D26A]/10 text-[#00D26A]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-[#00D26A]">
              {onTrack.length} goal{onTrack.length !== 1 ? "s" : ""} on track
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
