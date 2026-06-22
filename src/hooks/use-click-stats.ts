"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";
import { subscribe } from "@/lib/refresh-bus";

interface DailyCount {
  date: string;
  count: number;
}

export interface RecentClick {
  id: string;
  clicked_at: string;
  country: string | null;
  device_type: string | null;
  referer: string | null;
  link_slug: string;
  link_title: string | null;
}

interface ClickStats {
  totalClicks: number;
  clicksToday: number;
  dailyCounts: DailyCount[];
  recentClicks: RecentClick[];
  loading: boolean;
}

// `useClickStats` previously depended on the full `links` array which
// recreated `fetchStats` on every link mutation (including click_count
// realtime updates), triggering 3 queries each time. Now it depends only
// on the team id + a memoised join-key of link IDs — link count/title
// edits no longer cascade refetches. The 14-day aggregation also moved
// to a Postgres RPC (`dashboard_click_stats`) so we transfer 3 numbers +
// 14 rows instead of every raw click row.
// Per-team stats cache (stale-while-revalidate) so the dashboard numbers
// + chart render instantly on repeat visits instead of waiting on the RPC.
const STATS_CACHE_PREFIX = "tappr_stats_cache_";
interface StatsSnapshot {
  totalClicks: number;
  clicksToday: number;
  dailyCounts: DailyCount[];
  recentClicks: RecentClick[];
}
function readStatsCache(teamId: string): StatsSnapshot | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STATS_CACHE_PREFIX + teamId) : null;
    return raw ? (JSON.parse(raw) as StatsSnapshot) : null;
  } catch { return null; }
}

export function useClickStats(): ClickStats {
  const { activeTeam } = useTeam();
  const { links } = useLinks();
  // Deterministic initial state (same on the server + first client render)
  // to avoid a hydration mismatch. The cached snapshot is applied in an
  // effect AFTER mount — see below — so the dashboard still paints numbers
  // near-instantly without diverging from the server-rendered HTML.
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>(buildEmptyDays());
  const [recentClicks, setRecentClicks] = useState<RecentClick[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Hydrate from the localStorage snapshot post-mount (client-only) for the
  // active / last-active team, then the fetch below revalidates.
  useEffect(() => {
    const tid = activeTeam?.id ?? (typeof window !== "undefined" ? localStorage.getItem("active_team_id") : null);
    if (!tid) return;
    const snap = readStatsCache(tid);
    if (snap) {
      setTotalClicks(snap.totalClicks);
      setClicksToday(snap.clicksToday);
      setDailyCounts(snap.dailyCounts);
      setRecentClicks(snap.recentClicks);
      setLoading(false);
    }
  }, [activeTeam?.id]);

  // Stable join-key derived from link IDs. Re-computes only when the
  // SET of links changes (create / delete), not on metadata edits or
  // click_count bumps, which would otherwise re-run the recent-clicks
  // query unnecessarily.
  const linkIdsKey = useMemo(
    () => links.map((l) => l.id).sort().join("|"),
    [links]
  );

  const fetchStats = useCallback(async () => {
    if (!activeTeam?.id) {
      setLoading(false);
      return;
    }

    // Empty team — skip the round trip entirely.
    const linkIds = linkIdsKey ? linkIdsKey.split("|") : [];
    if (linkIds.length === 0) {
      setTotalClicks(0);
      setClicksToday(0);
      setDailyCounts(buildEmptyDays());
      setRecentClicks([]);
      setLoading(false);
      try { localStorage.removeItem(STATS_CACHE_PREFIX + activeTeam.id); } catch {}
      return;
    }

    // Only show the skeleton when there's no cached snapshot to display.
    if (!readStatsCache(activeTeam.id)) setLoading(true);

    // Fire both in parallel: the aggregated RPC (one round trip, server
    // does the grouping) + the recent 20 rows for the activity feed.
    const [statsRes, recentRes] = await Promise.all([
      supabase.rpc("dashboard_click_stats", { p_team_id: activeTeam.id }),
      supabase
        .from("link_clicks")
        .select("id, clicked_at, country, device_type, referer, link_id, links(slug, title)")
        .in("link_id", linkIds)
        .order("clicked_at", { ascending: false })
        .limit(20),
    ]);

    const ok = !statsRes.error;
    let snapTotal = 0, snapToday = 0;
    let snapDaily: DailyCount[] = buildEmptyDays();
    let snapRecent: RecentClick[] = [];

    if (statsRes.error) {
      console.error("Error fetching click stats:", statsRes.error.message);
    } else {
      const data = (statsRes.data ?? {}) as {
        total_clicks?: number;
        clicks_today?: number;
        daily?: DailyCount[];
      };
      snapTotal = Number(data.total_clicks ?? 0);
      snapToday = Number(data.clicks_today ?? 0);
      snapDaily =
        Array.isArray(data.daily) && data.daily.length > 0
          ? data.daily.map((d) => ({ date: d.date, count: Number(d.count) }))
          : buildEmptyDays();
      setTotalClicks(snapTotal);
      setClicksToday(snapToday);
      setDailyCounts(snapDaily);
    }

    if (recentRes.data) {
      snapRecent = recentRes.data.map((click: Record<string, unknown>) => {
        const link = click.links as { slug?: string; title?: string | null } | null;
        return {
          id: String(click.id),
          clicked_at: String(click.clicked_at),
          country: (click.country as string | null) ?? null,
          device_type: (click.device_type as string | null) ?? null,
          referer: (click.referer as string | null) ?? null,
          link_slug: link?.slug ?? "",
          link_title: link?.title ?? null,
        };
      });
      setRecentClicks(snapRecent);
    }

    // Persist the fresh snapshot (only when the RPC succeeded) for an
    // instant render next time.
    if (ok) {
      try {
        localStorage.setItem(
          STATS_CACHE_PREFIX + activeTeam.id,
          JSON.stringify({ totalClicks: snapTotal, clicksToday: snapToday, dailyCounts: snapDaily, recentClicks: snapRecent })
        );
      } catch {}
    }

    setLoading(false);
  }, [activeTeam?.id, linkIdsKey, supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Listen to link mutations elsewhere in the app — when a click is
  // recorded, the refresh-bus emits a "links" event with kind "update"
  // (click_count change). We use a debounced refetch so quick bursts
  // don't hammer the RPC.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchStats, 1500);
    };
    const off = subscribe("links", (event) => {
      // Only refresh stats on click-count-affecting events (create/refetch).
      // Metadata edits (title rename, etc.) leave totals untouched.
      if (!event || event.kind === "refetch" || event.kind === "create") {
        schedule();
      }
    });
    return () => { if (timer) clearTimeout(timer); off(); };
  }, [fetchStats]);

  return { totalClicks, clicksToday, dailyCounts, recentClicks, loading };
}

function buildEmptyDays(): DailyCount[] {
  const days: DailyCount[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().split("T")[0], count: 0 });
  }
  return days;
}
