"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { useTeam } from "./use-team";
import { emit, subscribe } from "@/lib/refresh-bus";
import { revalidateSlugCache } from "@/lib/revalidate-slug";
import { toast } from "sonner";
import { Database } from "@/types/database";

export type Collection = Database["public"]["Tables"]["collections"]["Row"] & {
  link_count?: number;
};
type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];

// Per-team collections cache (stale-while-revalidate) so the collections
// view renders instantly from localStorage on repeat visits / team switch,
// then refreshes in the background. Mirrors the links/stats caches.
const COLLECTIONS_CACHE_PREFIX = "tappr_collections_cache_";
function readCollectionsCache(teamId: string): Collection[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(COLLECTIONS_CACHE_PREFIX + teamId) : null;
    return raw ? (JSON.parse(raw) as Collection[]) : null;
  } catch { return null; }
}
function writeCollectionsCache(teamId: string, collections: Collection[]) {
  try { localStorage.setItem(COLLECTIONS_CACHE_PREFIX + teamId, JSON.stringify(collections)); } catch {}
}

export function useCollections() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  // Deterministic initial state (empty) so the server + first client render
  // match — no hydration mismatch. The cached snapshot is applied in the
  // activeTeam effect below, post-mount.
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  // Tracks whether we have rows to display — lets fetchCollections decide
  // whether to show a skeleton without a stale-closure dependency.
  const hasDataRef = useRef(false);

  const fetchCollections = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    // Only show the skeleton when there's nothing cached to display.
    if (!hasDataRef.current) setLoading(true);

    // Two parallel queries: the collection rows + one GROUP BY for the
    // per-collection link counts (RPC), instead of the old
    // `link_count:links(count)` nested select which ran a correlated
    // subquery per collection row.
    const [collectionsRes, countsRes] = await Promise.all([
      supabase
        .from("collections")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
      supabase.rpc("team_collection_link_counts", { p_team_id: teamId }),
    ]);

    const { data, error } = collectionsRes;
    if (error) {
      console.error("Error fetching collections:", error.message);
    } else {
      const counts = new Map<string, number>();
      for (const row of (countsRes.data ?? []) as { collection_id: string; count: number | string }[]) {
        counts.set(row.collection_id, Number(row.count) || 0);
      }
      const formatted = (data || []).map((c: any) => ({
        ...c,
        link_count: counts.get(c.id) ?? 0,
      }));
      setCollections(formatted);
      hasDataRef.current = formatted.length > 0;
      writeCollectionsCache(teamId, formatted);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      // Swap in cached collections for this team instantly (covers team
      // switch), then revalidate from the server.
      const cachedForTeam = readCollectionsCache(activeTeam.id);
      if (cachedForTeam) {
        setCollections(cachedForTeam);
        hasDataRef.current = cachedForTeam.length > 0;
      }
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

  // Cross-instance refresh. We mirror the pattern from LinksProvider:
  // typed events (create / update / delete) apply the mutation locally
  // in every other useCollections() instance, so the UI updates the
  // SAME TICK the mutation happens — no waiting for a server round trip.
  // Untyped events (or `kind: "refetch"`) still fall back to a full
  // refetch for bulk ops.
  useEffect(() => {
    const offCollections = subscribe("collections", (event) => {
      if (!event || event.kind === "refetch") {
        fetchCollections();
        return;
      }
      if (event.kind === "create") {
        const row = event.row as Collection;
        setCollections((prev) =>
          prev.some((c) => c.id === row.id) ? prev : [row, ...prev]
        );
        return;
      }
      if (event.kind === "update") {
        const row = event.row as Collection;
        setCollections((prev) =>
          prev.map((c) => (c.id === row.id ? { ...c, ...row, link_count: c.link_count } : c))
        );
        return;
      }
      if (event.kind === "delete") {
        setCollections((prev) => prev.filter((c) => c.id !== event.id));
        return;
      }
    });
    // Link mutations may shift link_count per collection, but it's
    // expensive to refetch on every link change. Skip — the click_count
    // surfaces only on the detail view.
    return () => { offCollections(); };
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

      const row = { ...data, link_count: 0 } as Collection;
      setCollections((prev) =>
        prev.some((c) => c.id === row.id) ? prev : [row, ...prev]
      );
      // Typed event so other useCollections() instances (e.g. the page
      // listing the tree) prepend the new row immediately without a
      // server round-trip.
      emit("collections", { kind: "create", row });
      toast.success("Collection created!");
      // A brand-new rotator claims a slug that may already hold a cached
      // "not found" entry from an earlier probe.
      revalidateSlugCache({ slugs: [rotatorSlug] });
      return data;
    },
    [user, activeTeam, supabase]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      const rotatorSlug = collections.find((c) => c.id === id)?.rotator_slug;

      const { error } = await supabase.from("collections").delete().eq("id", id);

      if (error) {
        toast.error(error.message || "Failed to delete collection");
        throw error;
      }

      setCollections((prev) => prev.filter((c) => c.id !== id));
      emit("collections", { kind: "delete", id });
      revalidateSlugCache({ slugs: [rotatorSlug] });
      toast.success("Collection deleted");
    },
    [supabase, collections]
  );

  const updateCollection = useCallback(
    async (id: string, updates: { name?: string; description?: string | null; color?: string; click_goal?: number | null; click_goal_period?: string | null; is_starred?: boolean; is_rotator?: boolean; rotator_slug?: string | null; parent_id?: string | null; position_x?: number | null; position_y?: number | null }, opts?: { silent?: boolean }) => {
      // Toggling is_rotator or renaming rotator_slug changes which slug the
      // resolver serves this collection under, so both the old and the new one
      // have to be purged.
      const previousRotatorSlug = collections.find((c) => c.id === id)?.rotator_slug;

      const { error } = await supabase
        .from("collections")
        .update(updates)
        .eq("id", id);

      if (error) {
        if (!opts?.silent) toast.error("Failed to update collection");
        throw error;
      }

      revalidateSlugCache({ slugs: [previousRotatorSlug, updates.rotator_slug] });

      let updatedRow: Collection | null = null;
      setCollections((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const next = { ...c, ...updates } as Collection;
          updatedRow = next;
          return next;
        })
      );
      // Broadcast the merged row so other instances (page tree, canvas,
      // dialogs) mirror the change in the same tick.
      if (updatedRow) emit("collections", { kind: "update", row: updatedRow });
      if (!opts?.silent) toast.success("Collection updated");
    },
    [supabase, collections]
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
      // Read the links' current collections *before* the move. Moving a link
      // changes the member list of both rotators involved — the one it leaves
      // and the one it joins — and each is cached under its own rotator_slug.
      // Once the update lands, the old collection id is gone for good.
      const { data: before } = await supabase
        .from("links")
        .select("collection_id")
        .in("id", linkIds);

      const previousCollectionIds = ((before ?? []) as { collection_id: string | null }[]).map(
        (l) => l.collection_id
      );

      const affectedCollectionIds = [
        ...new Set(
          [...previousCollectionIds, collectionId].filter((c): c is string => !!c)
        ),
      ];

      for (const linkId of linkIds) {
        const { error } = await supabase
          .from("links")
          .update({ collection_id: collectionId })
          .eq("id", linkId);

        if (error) {
          console.error("Error moving link:", error.message);
        }
      }

      revalidateSlugCache({ collectionIds: affectedCollectionIds });

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
