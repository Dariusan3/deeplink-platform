"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";

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

export function useClickStats(): ClickStats {
  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const [totalClicks, setTotalClicks] = useState(0);
  const [clicksToday, setClicksToday] = useState(0);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [recentClicks, setRecentClicks] = useState<RecentClick[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchStats = useCallback(async () => {
    const linkIds = links.map((l) => l.id);
    if (linkIds.length === 0) {
      setTotalClicks(0);
      setClicksToday(0);
      setDailyCounts(buildEmptyDays());
      setRecentClicks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get total clicks from link click_count already in links
    const total = links.reduce((sum, l) => sum + (l.click_count || 0), 0);
    setTotalClicks(total);

    // Get clicks for the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("link_clicks")
      .select("clicked_at")
      .in("link_id", linkIds)
      .gte("clicked_at", fourteenDaysAgo.toISOString());

    if (error) {
      console.error("Error fetching click stats:", error.message);
      setLoading(false);
      return;
    }

    // Group by date
    const countsByDate: Record<string, number> = {};
    const todayStr = new Date().toISOString().split("T")[0];
    let todayCount = 0;

    (data || []).forEach((click) => {
      const dateStr = click.clicked_at.split("T")[0];
      countsByDate[dateStr] = (countsByDate[dateStr] || 0) + 1;
      if (dateStr === todayStr) todayCount++;
    });

    setClicksToday(todayCount);

    // Build 14-day array
    const days: DailyCount[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: dateStr, count: countsByDate[dateStr] || 0 });
    }
    setDailyCounts(days);

    // Fetch recent clicks with link info
    const { data: recentData } = await supabase
      .from("link_clicks")
      .select("id, clicked_at, country, device_type, referer, link_id, links(slug, title)")
      .in("link_id", linkIds)
      .order("clicked_at", { ascending: false })
      .limit(20);

    if (recentData) {
      const mapped: RecentClick[] = recentData.map((click: any) => ({
        id: click.id,
        clicked_at: click.clicked_at,
        country: click.country,
        device_type: click.device_type,
        referer: click.referer,
        link_slug: click.links?.slug || "",
        link_title: click.links?.title || null,
      }));
      setRecentClicks(mapped);
    }

    setLoading(false);
  }, [links, supabase]);

  useEffect(() => {
    fetchStats();
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
