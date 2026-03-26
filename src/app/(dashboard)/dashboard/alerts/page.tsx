"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLinks } from "@/hooks/use-links";
import { useCollections } from "@/hooks/use-collections";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Target,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  LinkIcon,
  Bell,
  BellOff,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
  FolderOpen,
  Pause,
} from "lucide-react";

interface GoalStatus {
  type: "link" | "collection";
  id: string;
  name: string;
  goal: number;
  period: string;
  current: number;
  met: boolean;
}

interface Anomaly {
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  changePercent?: number;
}

export default function AlertsPage() {
  const { links } = useLinks();
  const { collections } = useCollections();
  const supabase = useMemo(() => createClient(), []);

  const [goalStatuses, setGoalStatuses] = useState<GoalStatus[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const getPeriodLabel = (period: string) => {
    if (period === "daily") return "today";
    if (period === "weekly") return "this week";
    return "this month";
  };

  const checkGoals = useCallback(async () => {
    const linksWithGoals = links.filter((l) => l.click_goal && l.click_goal > 0);
    const collectionsWithGoals = collections.filter((c) => c.click_goal && c.click_goal > 0);

    const results: GoalStatus[] = [];

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
        id: link.id,
        name: link.title || link.slug,
        goal: link.click_goal!,
        period: link.click_goal_period || "daily",
        current,
        met: current >= link.click_goal!,
      });
    }

    for (const col of collectionsWithGoals) {
      const colLinks = links.filter((l) => l.collection_id === col.id);
      if (colLinks.length === 0) {
        results.push({
          type: "collection",
          id: col.id,
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
        id: col.id,
        name: col.name,
        goal: col.click_goal!,
        period: col.click_goal_period || "daily",
        current,
        met: current >= col.click_goal!,
      });
    }

    setGoalStatuses(results);
  }, [links, collections, supabase, getPeriodStart]);

  const checkAnomalies = useCallback(async () => {
    if (links.length === 0) return;

    const linkIds = links.map((l) => l.id);
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    try {
      const topLinkIds = links.slice(0, 3).map((l) => l.id);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        { count: recentClicks },
        { count: prevClicks },
        { data: recentLinkRows },
        { data: historyRows },
      ] = await Promise.all([
        supabase
          .from("link_clicks")
          .select("*", { count: "exact", head: true })
          .in("link_id", linkIds)
          .gte("clicked_at", twoHoursAgo.toISOString()),
        supabase
          .from("link_clicks")
          .select("*", { count: "exact", head: true })
          .in("link_id", linkIds)
          .gte("clicked_at", fourHoursAgo.toISOString())
          .lt("clicked_at", twoHoursAgo.toISOString()),
        supabase
          .from("link_clicks")
          .select("link_id")
          .in("link_id", topLinkIds)
          .gte("clicked_at", twoHoursAgo.toISOString()),
        supabase
          .from("link_clicks")
          .select("link_id")
          .in("link_id", topLinkIds)
          .gte("clicked_at", sevenDaysAgo.toISOString()),
      ]);

      // Per-link recent 2h counts
      const recentByLink: Record<string, number> = {};
      for (const row of recentLinkRows ?? []) {
        recentByLink[row.link_id] = (recentByLink[row.link_id] ?? 0) + 1;
      }

      // Per-link historical avg per 2h window (7 days = 84 two-hour windows)
      const avgByLink: Record<string, number> = {};
      for (const row of historyRows ?? []) {
        avgByLink[row.link_id] = (avgByLink[row.link_id] ?? 0) + 1;
      }
      for (const id of topLinkIds) {
        avgByLink[id] = (avgByLink[id] ?? 0) / 84;
      }

      const res = await fetch("/api/ai/anomaly-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentHours: recentClicks ?? 0,
          previousHours: prevClicks ?? 0,
          topLinks: links.slice(0, 3).map((l) => ({
            slug: l.slug,
            title: l.title,
            recentClicks: recentByLink[l.id] ?? 0,
            avgClicks: avgByLink[l.id] ?? 0,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);
      }
    } catch {
      // Silent fail
    }
  }, [links, supabase]);

  const loadAll = useCallback(async () => {
    await Promise.all([checkGoals(), checkAnomalies()]);
    setLoading(false);
  }, [checkGoals, checkAnomalies]);

  useEffect(() => {
    if (links.length > 0 || collections.length > 0) {
      void Promise.resolve().then(() => loadAll());
    } else {
      void Promise.resolve().then(() => setLoading(false));
    }
  }, [links.length, collections.length, loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    setDismissedAnomalies(new Set());
    await loadAll();
    setRefreshing(false);
  };

  // Derived alerts
  const inactiveLinks = links.filter((l) => !l.is_active);
  const linksNoClicks = links.filter((l) => (l.click_count ?? 0) === 0 && l.is_active);
  const linksNoCollection = links.filter((l) => !l.collection_id);
  const behindGoals = goalStatuses.filter((s) => !s.met);
  const onTrackGoals = goalStatuses.filter((s) => s.met);
  const visibleAnomalies = anomalies.filter((_, i) => !dismissedAnomalies.has(i));

  const totalAlerts = behindGoals.length + visibleAnomalies.length + inactiveLinks.length;

  return (
    <>
      <Header title="Alerts & Monitoring" />
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Alerts
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Goals, Anomalies &amp; Health Monitoring
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              totalAlerts > 0
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-[#00D26A]/10 text-[#00D26A] border border-[#00D26A]/20"
            )}>
              {totalAlerts > 0 ? (
                <><Bell className="w-3 h-3" /> {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}</>
              ) : (
                <><BellOff className="w-3 h-3" /> All clear</>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/5"
            >
              <RefreshCw className={cn("w-3 h-3 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ═══ CLICK GOALS ═══ */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00D26A]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                  Click Goals
                </h3>
                {goalStatuses.length > 0 && (
                  <span className="text-[10px] font-bold text-neutral-600 ml-auto">
                    {onTrackGoals.length}/{goalStatuses.length} on track
                  </span>
                )}
              </div>

              {goalStatuses.length === 0 ? (
                <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed">
                  <CardContent className="p-6 text-center">
                    <Target className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-400">No click goals set</p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Set goals on your links or collections to track progress here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {behindGoals.map((status) => {
                    const pct = Math.round((status.current / status.goal) * 100);
                    return (
                      <div
                        key={`${status.type}-${status.id}`}
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
                            <span className="text-[9px] font-bold text-neutral-500 capitalize">
                              {status.period} &middot; {getPeriodLabel(status.period)}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            {status.type === "collection" ? (
                              <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
                            ) : (
                              <LinkIcon className="w-3.5 h-3.5 text-neutral-500" />
                            )}
                            {status.name}
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
                              {status.current}/{status.goal} ({pct}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {onTrackGoals.map((status) => (
                    <div
                      key={`${status.type}-${status.id}`}
                      className="rounded-xl border border-[#00D26A]/20 bg-[#00D26A]/5 p-4 flex items-center gap-3"
                    >
                      <div className="p-1.5 rounded-lg shrink-0 bg-[#00D26A]/10 text-[#00D26A]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#00D26A] flex items-center gap-2">
                          {status.type === "collection" ? (
                            <FolderOpen className="w-3.5 h-3.5" />
                          ) : (
                            <LinkIcon className="w-3.5 h-3.5" />
                          )}
                          {status.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-bold mt-0.5">
                          {status.current}/{status.goal} {status.period} goal &middot; On track
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ═══ AI ANOMALIES ═══ */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00D26A]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                  AI Anomaly Detection
                </h3>
              </div>

              {visibleAnomalies.length === 0 ? (
                <Card className="glass-card bg-white/[0.01] border-white/5 border-dashed">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-[#00D26A]/40 mx-auto mb-3" />
                    <p className="text-sm font-bold text-neutral-400">No anomalies detected</p>
                    <p className="text-xs text-neutral-600 mt-1">
                      Traffic patterns look normal in the last 4 hours
                    </p>
                  </CardContent>
                </Card>
              ) : (
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
                        onClick={() => setDismissedAnomalies((prev) => new Set([...prev, i]))}
                        className="text-neutral-600 hover:text-white transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ═══ LINK HEALTH ═══ */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#00D26A]" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                  Link Health
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Inactive links */}
                <Card className={cn(
                  "glass-card border-white/5",
                  inactiveLinks.length > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-white/[0.01]"
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Pause className="w-4 h-4 text-amber-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        Paused Links
                      </span>
                    </div>
                    <p className="text-3xl font-black text-white">{inactiveLinks.length}</p>
                    {inactiveLinks.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {inactiveLinks.slice(0, 5).map((l) => (
                          <p key={l.id} className="text-[10px] text-neutral-500 truncate">
                            {l.title || l.slug}
                          </p>
                        ))}
                        {inactiveLinks.length > 5 && (
                          <p className="text-[10px] text-neutral-600">
                            +{inactiveLinks.length - 5} more
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Links with zero clicks */}
                <Card className={cn(
                  "glass-card border-white/5",
                  linksNoClicks.length > 0 ? "bg-white/[0.02]" : "bg-white/[0.01]"
                )}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4 text-neutral-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        Zero Clicks
                      </span>
                    </div>
                    <p className="text-3xl font-black text-white">{linksNoClicks.length}</p>
                    {linksNoClicks.length > 0 && (
                      <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                        {linksNoClicks.slice(0, 5).map((l) => (
                          <p key={l.id} className="text-[10px] text-neutral-500 truncate">
                            {l.title || l.slug}
                          </p>
                        ))}
                        {linksNoClicks.length > 5 && (
                          <p className="text-[10px] text-neutral-600">
                            +{linksNoClicks.length - 5} more
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Unorganized links */}
                <Card className="glass-card bg-white/[0.01] border-white/5">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOpen className="w-4 h-4 text-neutral-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        No Collection
                      </span>
                    </div>
                    <p className="text-3xl font-black text-white">{linksNoCollection.length}</p>
                    <p className="text-[10px] text-neutral-600 mt-1">
                      {linksNoCollection.length > 0
                        ? "Links not assigned to any collection"
                        : "All links organized"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ═══ SUMMARY ═══ */}
            {totalAlerts === 0 && goalStatuses.length === 0 && (
              <Card className="glass-card bg-[#00D26A]/5 border-[#00D26A]/20">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[#00D26A]/40 mx-auto mb-4" />
                  <h3 className="text-lg font-black text-white mb-1">Everything Looks Good</h3>
                  <p className="text-sm text-neutral-400">
                    No alerts or goals to monitor. Set click goals on your links or collections to start tracking.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </>
  );
}
