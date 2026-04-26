"use client";

import { useState, useEffect, useCallback } from "react";
import type { PartnerStats, PartnerLeaderboardEntry } from "@/types/partner";

export function usePartnerStats() {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { stats, loading, refresh: fetch_ };
}

export function usePartnerLeaderboard() {
  const [entries, setEntries] = useState<PartnerLeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/leaderboard");
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const data = await res.json();
      setEntries(data.entries || []);
      setMyRank(data.myRank ?? null);
    } catch {
      setEntries([]);
      setMyRank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { entries, myRank, loading, refresh: fetch_ };
}
