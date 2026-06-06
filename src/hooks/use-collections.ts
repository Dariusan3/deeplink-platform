"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useTeam } from "./use-team";
import { emit, subscribe } from "@/lib/refresh-bus";
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

  // Cross-instance refresh: any collection mutation (or link mutation that
  // affects link_count) emits — every useCollections() instance refetches.
  useEffect(() => {
    const offCollections = subscribe("collections", () => fetchCollections());
    const offLinks = subscribe("links", () => fetchCollections());
    return () => { offCollections(); offLinks(); };
  }, [fetchCollections]);

  const createCollection = useCallback(
    async (name: string, description?: string, color?: string, clickGoal?: number, clickGoalPeriod?: string, isRotator?: boolean, isStarred?: boolean, parentId?: string | null) => {
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
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message || "Failed to create collection");
        throw error;
      }

      setCollections((prev) => [{ ...data, link_count: 0 }, ...prev]);
      emit("collections");
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
      emit("collections");
      toast.success("Collection deleted");
    },
    [supabase]
  );

  const updateCollection = useCallback(
    async (id: string, updates: { name?: string; description?: string | null; color?: string; click_goal?: number | null; click_goal_period?: string | null; is_starred?: boolean; is_rotator?: boolean; rotator_slug?: string | null; parent_id?: string | null; position_x?: number | null; position_y?: number | null }, opts?: { silent?: boolean }) => {
      const { error } = await supabase
        .from("collections")
        .update(updates)
        .eq("id", id);

      if (error) {
        if (!opts?.silent) toast.error("Failed to update collection");
        throw error;
      }

      setCollections((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      emit("collections");
      if (!opts?.silent) toast.success("Collection updated");
    },
    [supabase]
  );

  // Reparent + optional positions. Wraps updateCollection but uses silent
  // mode to avoid toast spam during canvas drags or tree DnD operations.
  const reparentCollection = useCallback(
    async (id: string, newParentId: string | null, position?: { x: number; y: number }) => {
      await updateCollection(
        id,
        {
          parent_id: newParentId,
          ...(position ? { position_x: position.x, position_y: position.y } : {}),
        },
        { silent: true }
      );
    },
    [updateCollection]
  );

  // Save canvas position without changing parent — called from React Flow
  // node drag handlers. Silent so dragging doesn't fire a toast.
  const saveCollectionPosition = useCallback(
    async (id: string, x: number, y: number) => {
      await updateCollection(id, { position_x: x, position_y: y }, { silent: true });
    },
    [updateCollection]
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
      emit("links");
      emit("collections");
    },
    [supabase]
  );

  return {
    collections,
    loading,
    fetchCollections,
    createCollection,
    deleteCollection,
    updateCollection,
    reparentCollection,
    saveCollectionPosition,
    moveLinksToCollection,
  };
}
