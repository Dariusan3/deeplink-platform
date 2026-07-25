"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useTeam } from "./use-team";
import { readSwrCache, writeSwrCache } from "@/lib/swr-cache";
import { revalidateSlugCache } from "@/lib/revalidate-slug";
import { toast } from "sonner";

type TeamSettings = Database["public"]["Tables"]["team_settings"]["Row"];
type TeamSettingsUpdate = Database["public"]["Tables"]["team_settings"]["Update"];

const SETTINGS_CACHE_PREFIX = "tappr_settings_cache_";

export function useSettings() {
  const { activeTeam } = useTeam();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Hydrate from cache post-mount so settings (e.g. timezone, consumed by
  // analytics) are available instantly on repeat visits.
  useEffect(() => {
    if (!activeTeam?.id) return;
    const cached = readSwrCache<TeamSettings>(SETTINGS_CACHE_PREFIX, activeTeam.id);
    if (cached) { setSettings(cached); setLoading(false); }
  }, [activeTeam?.id]);

  const fetchSettings = useCallback(async () => {
    if (!activeTeam?.id) return;
    if (!readSwrCache(SETTINGS_CACHE_PREFIX, activeTeam.id)) setLoading(true);

    const { data, error } = await supabase
      .from("team_settings")
      .select("*")
      .eq("team_id", activeTeam.id)
      .single();

    if (error && error.code === "PGRST116") {
      // No settings row yet — create default (upsert to avoid race condition duplicates)
      const { data: newSettings, error: insertError } = await supabase
        .from("team_settings")
        .upsert({ team_id: activeTeam.id }, { onConflict: "team_id" })
        .select()
        .single();

      if (insertError) {
        // If upsert still fails, try fetching again (another request may have created it)
        const { data: retry } = await supabase
          .from("team_settings")
          .select("*")
          .eq("team_id", activeTeam.id)
          .single();
        if (retry) {
          setSettings(retry);
          writeSwrCache(SETTINGS_CACHE_PREFIX, activeTeam.id, retry);
        } else {
          console.error("Error creating default settings:", insertError.message);
        }
      } else {
        setSettings(newSettings);
        if (newSettings) writeSwrCache(SETTINGS_CACHE_PREFIX, activeTeam.id, newSettings);
      }
    } else if (error) {
      console.error("Error fetching settings:", error.message);
    } else {
      setSettings(data);
      if (data) writeSwrCache(SETTINGS_CACHE_PREFIX, activeTeam.id, data);
    }

    setLoading(false);
  }, [activeTeam?.id, supabase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<Omit<TeamSettingsUpdate, "id" | "team_id" | "created_at">>) => {
      if (!settings) return;

      const { data, error } = await supabase
        .from("team_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", settings.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error.message);
        toast.error(
          error.message?.includes("PLAN_LIMIT:")
            ? error.message.replace(/^.*PLAN_LIMIT:\s*/, "")
            : "Failed to save settings"
        );
        throw error;
      }

      // The slug resolver caches each link together with its team's timezone,
      // because the redirect engine evaluates hour / day-of-week rules in it.
      // Change the zone and every link the team owns is cached against the old
      // one — so purge the whole team, not just a slug.
      if (updates.timezone !== undefined && settings.team_id) {
        revalidateSlugCache({ teamId: settings.team_id });
      }

      setSettings(data);
      if (data && activeTeam?.id) writeSwrCache(SETTINGS_CACHE_PREFIX, activeTeam.id, data);
      toast.success("Settings saved");
      return data;
    },
    [settings, supabase, activeTeam?.id]
  );

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
