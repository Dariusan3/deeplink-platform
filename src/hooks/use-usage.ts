"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useLinks } from "./use-links";

interface UsageData {
  monthlyClicks: number;
  limit: number;
  percentage: number;
  daysUntilReset: number;
  loading: boolean;
}

const FREE_TIER_LIMIT = 500;

export function useUsage(): UsageData {
  const { activeTeam } = useTeam();
  const { links } = useLinks();
  const [monthlyClicks, setMonthlyClicks] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchUsage = useCallback(async () => {
    const linkIds = links.map((l) => l.id);
    if (linkIds.length === 0) {
      setMonthlyClicks(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count, error } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", firstOfMonth.toISOString());

    if (error) {
      console.error("Error fetching usage:", error.message);
    } else {
      setMonthlyClicks(count || 0);
    }
    setLoading(false);
  }, [links, supabase]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Days until next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    monthlyClicks,
    limit: FREE_TIER_LIMIT,
    percentage: Math.min((monthlyClicks / FREE_TIER_LIMIT) * 100, 100),
    daysUntilReset,
    loading,
  };
}
