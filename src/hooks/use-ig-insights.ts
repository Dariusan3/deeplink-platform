"use client";

import { useState, useCallback, useEffect } from "react";
import { useTeam } from "./use-team";
import { useInstagram } from "./use-instagram";

export interface IgProfile {
  username: string;
  accountType: string | null;
  followers: number | null;
  following: number | null;
  mediaCount: number | null;
}

export interface IgInsights {
  profileViews: number;
  impressions: number;
  reach: number;
  dailyProfileViews: { date: string; value: number }[];
}

export function useIgInsights() {
  const { activeTeam } = useTeam();
  const { isConnected, loading: igLoading } = useInstagram();
  const [profile, setProfile] = useState<IgProfile | null>(null);
  const [insights, setInsights] = useState<IgInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!activeTeam?.id || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/ig/insights?teamId=${activeTeam.id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to fetch insights");
        return;
      }

      const data = await res.json();
      setProfile(data.profile);
      setInsights(data.insights);
    } catch {
      setError("Network error fetching Instagram insights");
    } finally {
      setLoading(false);
    }
  }, [activeTeam?.id, isConnected]);

  useEffect(() => {
    if (!igLoading && isConnected) {
      fetchInsights();
    }
  }, [igLoading, isConnected, fetchInsights]);

  return {
    profile,
    insights,
    loading: loading || igLoading,
    error,
    isConnected,
    fetchInsights,
  };
}
