import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useUser } from "./use-user";
import { useTeam } from "./use-team";
import { toast } from "sonner";

import { Link, LinkInsert } from "@/types/links";

export function useLinks() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchLinks = useCallback(async (explicitTeamId?: string) => {
    // Try explicit ID, then activeTeam, then localStorage as absolute last resort for speed
    const teamId = explicitTeamId || activeTeam?.id || (typeof window !== 'undefined' ? localStorage.getItem("active_team_id") : null);

    if (!teamId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("links")
      .select("*, click_count:link_clicks(count)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching links:", error.message || error);
    } else {
      const formattedLinks = (data || []).map((l: any) => ({
        ...l,
        click_count: l.click_count?.[0]?.count || 0,
      }));
      setLinks(formattedLinks);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      fetchLinks();
    }
  }, [activeTeam?.id, fetchLinks]);

  // Realtime subscription for links
  useEffect(() => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`links-realtime-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "links",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          // Refetch on any change to get accurate click counts
          fetchLinks();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeam?.id, supabase, fetchLinks]);

  const createLink = useCallback(async (payload: Omit<LinkInsert, "id" | "created_at" | "updated_at" | "created_by" | "team_id">) => {
    if (!user || !activeTeam) throw new Error("Authentication required");

    const { data, error } = await supabase
      .from("links")
      .insert({
        ...payload,
        created_by: user.id,
        team_id: activeTeam.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating link:", error.message || error);
      throw error;
    }

    setLinks((prev) => [data, ...prev]);
    return data;
  }, [user, activeTeam, supabase]);

  const updateLink = useCallback(async (id: string, payload: Partial<LinkInsert>) => {
    const { data, error } = await supabase
      .from("links")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating link:", error.message || error);
      throw error;
    }

    setLinks((prev) => prev.map((l) => (l.id === id ? { ...data, click_count: l.click_count } : l)));
    return data;
  }, [supabase]);

  const deleteLink = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("links")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting link:", error.message || error);
      toast.error(error.message || "Failed to delete link");
      throw error;
    }

    setLinks((prev) => prev.filter((l) => l.id !== id));
    toast.success("Link decommissioned successfully");
  }, [supabase]);

  const toggleFavorite = useCallback(async (id: string, favorite: boolean) => {
    // Optimistic update so the sidebar reflects the change instantly.
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_favorite: favorite } : l)));

    const { error } = await supabase
      .from("links")
      .update({ is_favorite: favorite })
      .eq("id", id);

    if (error) {
      // Revert on failure.
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, is_favorite: !favorite } : l)));
      toast.error(error.message || "Failed to update favorite");
      throw error;
    }
  }, [supabase]);

  const resetClicks = useCallback(async (linkId: string) => {
    const { error } = await supabase
      .from("link_clicks")
      .delete()
      .eq("link_id", linkId);

    if (error) {
      console.error("Error resetting clicks:", error.message || error);
      toast.error(error.message || "Failed to reset clicks");
      throw error;
    }

    setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, click_count: 0 } : l)));
    toast.success("Telemetry reset successfully");
  }, [supabase]);

  return {
    links,
    loading,
    fetchLinks,
    createLink,
    updateLink,
    deleteLink,
    resetClicks,
    toggleFavorite,
  };
}
