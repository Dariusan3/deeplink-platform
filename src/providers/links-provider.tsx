"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTeam } from "@/hooks/use-team";
import { emit, subscribe } from "@/lib/refresh-bus";
import { toast } from "sonner";
import { Link, LinkInsert } from "@/types/links";

// Single source of truth for the team's links. Previously every `useLinks()`
// caller fetched independently — on the dashboard that meant the heavy
// `click_count:link_clicks(count)` aggregate ran 4-5× in parallel (page,
// useClickStats, sidebar, floating chat, goal tracker) and each opened its
// own realtime websocket. Hoisting the fetch + subscription into a provider
// collapses that to one query and one channel; consumers share the result.

interface LinksContextType {
  links: Link[];
  loading: boolean;
  fetchLinks: (explicitTeamId?: string) => Promise<void>;
  createLink: (
    payload: Omit<LinkInsert, "id" | "created_at" | "updated_at" | "created_by" | "team_id">
  ) => Promise<Link>;
  updateLink: (id: string, payload: Partial<LinkInsert>) => Promise<Link>;
  deleteLink: (id: string) => Promise<void>;
  toggleFavorite: (id: string, favorite: boolean) => Promise<void>;
}

const LinksContext = createContext<LinksContextType | undefined>(undefined);

export function LinksProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchLinks = useCallback(async (explicitTeamId?: string) => {
    // Try explicit ID, then activeTeam, then localStorage as absolute last resort for speed
    const teamId = explicitTeamId || activeTeam?.id || (typeof window !== "undefined" ? localStorage.getItem("active_team_id") : null);

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

  // Cross-tab / external refresh: mutations elsewhere `emit("links", event)`
  // a typed event so this store applies the change locally — no extra
  // round-trip. Fall back to fetchLinks() for payload-less events.
  useEffect(() => {
    return subscribe("links", (event) => {
      if (!event || event.kind === "refetch") {
        fetchLinks();
        return;
      }
      if (event.kind === "create") {
        const row = event.row as Link;
        setLinks((prev) =>
          prev.some((l) => l.id === row.id) ? prev : [row, ...prev]
        );
        return;
      }
      if (event.kind === "update") {
        const row = event.row as Link;
        setLinks((prev) =>
          prev.map((l) => (l.id === row.id ? { ...row, click_count: l.click_count } : l))
        );
        return;
      }
      if (event.kind === "delete") {
        setLinks((prev) => prev.filter((l) => l.id !== event.id));
        return;
      }
    });
  }, [fetchLinks]);

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
    emit("links", { kind: "create", row: data });
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
    emit("links", { kind: "update", row: data });
    return data;
  }, [supabase]);

  const deleteLink = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("links")
      .delete()
      .eq("id", id)
      .select("id");

    if (error) {
      console.error("Error deleting link:", error.message || error);
      toast.error(error.message || "Failed to delete link");
      throw error;
    }

    // The delete RLS policy is owner-only. A non-owner (editor) gets no error
    // but 0 rows are removed — without this check the UI would show a false
    // "success" and drop the row locally even though it survives in the DB.
    if (!data || data.length === 0) {
      toast.error("Couldn't delete — only the team owner can delete links.");
      throw new Error("Delete affected no rows (RLS owner-only or already gone).");
    }

    setLinks((prev) => prev.filter((l) => l.id !== id));
    emit("links", { kind: "delete", id });
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
    // Cross-instance update — favorites toggle in the sidebar without refetch.
    emit("links", { kind: "refetch" });
  }, [supabase]);

  const value = useMemo(
    () => ({ links, loading, fetchLinks, createLink, updateLink, deleteLink, toggleFavorite }),
    [links, loading, fetchLinks, createLink, updateLink, deleteLink, toggleFavorite]
  );

  return <LinksContext.Provider value={value}>{children}</LinksContext.Provider>;
}

export function useLinks(): LinksContextType {
  const ctx = useContext(LinksContext);
  if (ctx === undefined) {
    throw new Error("useLinks must be used within a LinksProvider");
  }
  return ctx;
}
