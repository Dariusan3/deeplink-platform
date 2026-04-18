"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useTeam } from "./use-team";
import { toast } from "sonner";
import { Database } from "@/types/database";

export type Collection = Database["public"]["Tables"]["collections"]["Row"] & {
  link_count?: number;
};
type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];

export function useCollections() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchCollections = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("collections")
      .select("*, link_count:links(count)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching collections:", error.message);
    } else {
      const formatted = (data || []).map((c: any) => ({
        ...c,
        link_count: c.link_count?.[0]?.count || 0,
      }));
      setCollections(formatted);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      fetchCollections();
    }
  }, [activeTeam?.id, fetchCollections]);

  // Realtime subscription for collections
  useEffect(() => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    const channel = supabase
      .channel(`collections-realtime-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collections",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchCollections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeam?.id, supabase, fetchCollections]);

  const createCollection = useCallback(
    async (name: string, description?: string, color?: string, clickGoal?: number, clickGoalPeriod?: string, isRotator?: boolean, isStarred?: boolean) => {
      if (!user || !activeTeam) throw new Error("Authentication required");

      const rotatorSlug = isRotator ? `r-${Math.random().toString(36).substring(2, 8)}` : null;

      const { data, error } = await supabase
        .from("collections")
        .insert({
          name,
          description: description || null,
          color: color || "#00D26A",
          team_id: activeTeam.id,
          created_by: user.id,
          click_goal: clickGoal || null,
          click_goal_period: clickGoalPeriod || null,
          is_rotator: isRotator || false,
          is_starred: isStarred || false,
          rotator_slug: rotatorSlug,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message || "Failed to create collection");
        throw error;
      }

      setCollections((prev) => [{ ...data, link_count: 0 }, ...prev]);
      toast.success("Collection created!");
      return data;
    },
    [user, activeTeam, supabase]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);

      if (error) {
        toast.error(error.message || "Failed to delete collection");
        throw error;
      }

      setCollections((prev) => prev.filter((c) => c.id !== id));
      toast.success("Collection deleted");
    },
    [supabase]
  );

  const updateCollection = useCallback(
    async (id: string, updates: { click_goal?: number | null; click_goal_period?: string | null; is_starred?: boolean; is_rotator?: boolean; rotator_slug?: string | null }) => {
      const { error } = await supabase
        .from("collections")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast.error("Failed to update collection");
        throw error;
      }

      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      toast.success("Collection updated");
    },
    [supabase]
  );

  const moveLinksToCollection = useCallback(
    async (linkIds: string[], collectionId: string | null) => {
      for (const linkId of linkIds) {
        const { error } = await supabase
          .from("links")
          .update({ collection_id: collectionId })
          .eq("id", linkId);

        if (error) {
          console.error("Error moving link:", error.message);
        }
      }

      toast.success(
        collectionId
          ? `Moved ${linkIds.length} link${linkIds.length !== 1 ? "s" : ""} to collection`
          : `Removed ${linkIds.length} link${linkIds.length !== 1 ? "s" : ""} from collection`
      );
      fetchCollections();
    },
    [supabase, fetchCollections]
  );

  return {
    collections,
    loading,
    fetchCollections,
    createCollection,
    deleteCollection,
    updateCollection,
    moveLinksToCollection,
  };
}
