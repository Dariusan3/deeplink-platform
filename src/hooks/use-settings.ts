"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useTeam } from "./use-team";
import { toast } from "sonner";

type TeamSettings = Database["public"]["Tables"]["team_settings"]["Row"];
type TeamSettingsUpdate = Database["public"]["Tables"]["team_settings"]["Update"];

export function useSettings() {
  const { activeTeam } = useTeam();
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchSettings = useCallback(async () => {
    if (!activeTeam?.id) return;
    setLoading(true);

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
        } else {
          console.error("Error creating default settings:", insertError.message);
        }
      } else {
        setSettings(newSettings);
      }
    } else if (error) {
      console.error("Error fetching settings:", error.message);
    } else {
      setSettings(data);
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
        toast.error("Failed to save settings");
        throw error;
      }

      setSettings(data);
      toast.success("Settings saved");
      return data;
    },
    [settings, supabase]
  );

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
