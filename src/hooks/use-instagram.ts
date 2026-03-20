"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { toast } from "sonner";
import { Database } from "@/types/database";

export type IgIntegration = Database["public"]["Tables"]["ig_integrations"]["Row"];

export function useInstagram() {
  const { activeTeam } = useTeam();
  const [integration, setIntegration] = useState<IgIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchIntegration = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("ig_integrations")
      .select("*")
      .eq("team_id", teamId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching IG integration:", error.message);
    }
    setIntegration(data || null);
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  const disconnect = useCallback(async () => {
    if (!integration) return;

    const { error } = await supabase
      .from("ig_integrations")
      .update({ is_active: false })
      .eq("id", integration.id);

    if (error) {
      toast.error("Failed to disconnect Instagram");
      return;
    }

    setIntegration(null);
    toast.success("Instagram disconnected");
  }, [integration, supabase]);

  const saveIntegration = useCallback(
    async (data: {
      ig_user_id: string;
      ig_username: string;
      access_token: string;
      token_expires_at?: string;
    }) => {
      if (!activeTeam) return;

      const { data: saved, error } = await supabase
        .from("ig_integrations")
        .insert({
          team_id: activeTeam.id,
          ig_user_id: data.ig_user_id,
          ig_username: data.ig_username,
          access_token: data.access_token,
          token_expires_at: data.token_expires_at || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to save Instagram integration");
        throw error;
      }

      setIntegration(saved);
      toast.success(`Connected @${data.ig_username}`);
      return saved;
    },
    [activeTeam, supabase]
  );

  return {
    integration,
    loading,
    isConnected: !!integration,
    disconnect,
    saveIntegration,
    fetchIntegration,
  };
}
