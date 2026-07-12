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
import { revalidateSlugCache } from "@/lib/revalidate-slug";
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

// Per-team link cache (stale-while-revalidate) so the links list and the
// dashboard render instantly from localStorage, then refresh in the
// background.
const LINKS_CACHE_PREFIX = "tappr_links_cache_";
function readLinksCache(teamId: string): Link[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LINKS_CACHE_PREFIX + teamId) : null;
    return raw ? (JSON.parse(raw) as Link[]) : null;
  } catch { return null; }
}
function writeLinksCache(teamId: string, links: Link[]) {
  try { localStorage.setItem(LINKS_CACHE_PREFIX + teamId, JSON.stringify(links)); } catch {}
}

export function LinksProvider({
  children,
  initialLinks,
}: {
  children: ReactNode;
  // Server-fetched links for the active team (from the dashboard layout
  // RSC) — seeds the first paint deterministically across SSR + hydration.
  initialLinks?: Link[];
}) {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  // Server initial data wins; localStorage cache is the client-only fallback.
  const [links, setLinks] = useState<Link[]>(() => {
    if (initialLinks) return initialLinks;
    if (typeof window === "undefined") return [];
    const tid = localStorage.getItem("active_team_id");
    return tid ? (readLinksCache(tid) ?? []) : [];
  });
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Tracks whether we currently have links to display — lets fetchLinks
  // decide whether to show a skeleton without a stale-closure dependency.
  const hasDataRef = useRef(links.length > 0);

  const fetchLinks = useCallback(async (explicitTeamId?: string) => {
    // Try explicit ID, then activeTeam, then localStorage as absolute last resort for speed
    const teamId = explicitTeamId || activeTeam?.id || (typeof window !== "undefined" ? localStorage.getItem("active_team_id") : null);

    if (!teamId) return;
    // Only show the loading skeleton when there's nothing cached to show
    // (hasDataRef tracks current links without a stale closure).
    if (!hasDataRef.current) setLoading(true);

    // Two parallel queries: the link rows themselves and a single
    // aggregate-per-link click count via RPC. Previously we shoved both
    // into one nested `click_count:link_clicks(count)` select which made
    // PostgREST run a correlated subquery per link row — slow on busy
    // accounts. The RPC is one GROUP BY scan.
    const [linksRes, countsRes] = await Promise.all([
      supabase
        .from("links")
        .select("*")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
      supabase.rpc("team_link_click_counts", { p_team_id: teamId }),
    ]);

    if (linksRes.error) {
      console.error("Error fetching links:", linksRes.error.message || linksRes.error);
    } else {
      const counts = new Map<string, number>();
      for (const row of (countsRes.data ?? []) as { link_id: string; count: number | string }[]) {
        counts.set(row.link_id, Number(row.count) || 0);
      }
      const formattedLinks = ((linksRes.data || []) as Link[]).map((l) => ({
        ...l,
        click_count: counts.get(l.id) ?? 0,
      }));
      setLinks(formattedLinks);
      hasDataRef.current = formattedLinks.length > 0;
      writeLinksCache(teamId, formattedLinks);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      // Swap in cached links for this team instantly (covers team switch),
      // then revalidate from the server.
      const cachedForTeam = readLinksCache(activeTeam.id);
      if (cachedForTeam) {
        setLinks(cachedForTeam);
        hasDataRef.current = cachedForTeam.length > 0;
      }
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

    // Yes, invalidate on *create* too. If anyone hit this slug before the link
    // existed, the resolver cached a "no such slug" resolution for it, and that
    // negative entry would keep 404ing the brand-new link until it aged out.
    revalidateSlugCache({ slugs: [data.slug], collectionIds: [data.collection_id] });
    return data;
  }, [user, activeTeam, supabase]);

  const updateLink = useCallback(async (id: string, payload: Partial<LinkInsert>) => {
    // Capture the pre-update row: an edit can move the link to a different slug
    // or a different collection, and the *old* slug's cache entry has to be
    // dropped as well — otherwise the old short link keeps resolving to the old
    // destination.
    const before = links.find((l) => l.id === id);

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

    revalidateSlugCache({
      slugs: [before?.slug, data.slug],
      collectionIds: [before?.collection_id, data.collection_id],
    });
    return data;
  }, [supabase, links]);

  const deleteLink = useCallback(async (id: string) => {
    // Read the slug before the row is gone — the delete only returns the id.
    const before = links.find((l) => l.id === id);

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

    revalidateSlugCache({
      slugs: [before?.slug],
      collectionIds: [before?.collection_id],
    });
    toast.success("Link decommissioned successfully");
  }, [supabase, links]);

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
