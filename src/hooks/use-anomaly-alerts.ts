"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { readSwrCache, writeSwrCache } from "@/lib/swr-cache";
import { Database } from "@/types/database";

export type AnomalyAlert = Database["public"]["Tables"]["anomaly_alerts"]["Row"];

// This hook powers the NotificationBell in the global header, so it mounts on
// EVERY dashboard page — cache the 50 most-recent alerts so the bell badge
// paints instantly instead of refetching on each navigation.
const ANOMALY_ALERTS_CACHE_PREFIX = "tappr_anomaly_alerts_cache_";

export function useAnomalyAlerts() {
  const { activeTeam } = useTeam();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Hydrate from cache post-mount.
  useEffect(() => {
    if (!activeTeam?.id) return;
    const cached = readSwrCache<AnomalyAlert[]>(ANOMALY_ALERTS_CACHE_PREFIX, activeTeam.id);
    if (cached) { setAlerts(cached); setLoading(false); }
  }, [activeTeam?.id]);

  const fetchAlerts = useCallback(async () => {
    if (!activeTeam?.id) return;

    const { data, error } = await supabase
      .from("anomaly_alerts")
      .select("*")
      .eq("team_id", activeTeam.id)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error) {
      const rows = data || [];
      setAlerts(rows);
      writeSwrCache(ANOMALY_ALERTS_CACHE_PREFIX, activeTeam.id, rows);
    }
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  // Subscribe to real-time inserts
  useEffect(() => {
    if (!activeTeam?.id) return;

    fetchAlerts();

    channelRef.current = supabase
      .channel(`anomaly_alerts_${activeTeam.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "anomaly_alerts",
          filter: `team_id=eq.${activeTeam.id}`,
        },
        (payload: any) => {
          const newAlert = payload.new as AnomalyAlert;
          setAlerts((prev) => [newAlert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [activeTeam?.id, supabase, fetchAlerts]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => !a.is_read).length,
    [alerts]
  );

  const highSeverityUnread = useMemo(
    () => alerts.filter((a) => !a.is_read && a.severity === "high"),
    [alerts]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      await supabase.from("anomaly_alerts").update({ is_read: true }).eq("id", id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!activeTeam?.id) return;
    await supabase
      .from("anomaly_alerts")
      .update({ is_read: true })
      .eq("team_id", activeTeam.id)
      .eq("is_read", false);
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
  }, [activeTeam?.id, supabase]);

  const dismiss = useCallback(
    async (id: string) => {
      await supabase.from("anomaly_alerts").update({ is_dismissed: true }).eq("id", id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    [supabase]
  );

  return {
    alerts,
    loading,
    unreadCount,
    highSeverityUnread,
    markAsRead,
    markAllAsRead,
    dismiss,
    fetchAlerts,
  };
}
