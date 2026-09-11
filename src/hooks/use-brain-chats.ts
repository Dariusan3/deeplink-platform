"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { emit, subscribe } from "@/lib/refresh-bus";
import { toast } from "sonner";
import { Database } from "@/types/database";
import { getBrainChatLimit } from "@/lib/plan-limits";

export type BrainChat = Database["public"]["Tables"]["brain_chats"]["Row"];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useBrainChats() {
  const { activeTeam } = useTeam();
  const [chats, setChats] = useState<BrainChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const chatLimit = useMemo(
    () => getBrainChatLimit(activeTeam?.plan ?? "free"),
    [activeTeam?.plan]
  );

  // How many NEW conversations this team has started today (UTC) — the same
  // window brain_daily_chat_cap() checks server-side (migration 031), so this
  // button disables at exactly the moment the real insert would be rejected.
  // Free is unaffected: its brainChats is Infinity (it's gated by
  // brainSessionHours, at message-send time, not here) — see entitlements.ts.
  const chatsToday = useMemo(() => {
    const startOfUtcDay = new Date();
    startOfUtcDay.setUTCHours(0, 0, 0, 0);
    return chats.filter((c) => new Date(c.created_at) >= startOfUtcDay).length;
  }, [chats]);

  const canCreateChat = useMemo(
    () => chatsToday < chatLimit,
    [chatsToday, chatLimit]
  );

  const fetchChats = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("brain_chats")
      .select("*")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching brain chats:", error.message);
    } else {
      setChats(data || []);
      // On first load, open the most recent chat
      setActiveChatId((prev) => (prev === null && data && data.length > 0 ? data[0].id : prev));
    }
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      fetchChats();
    }
  }, [activeTeam?.id, fetchChats]);

  useEffect(() => {
    return subscribe("brain-chats", () => fetchChats());
  }, [fetchChats]);

  const createChat = useCallback(async (): Promise<BrainChat | null> => {
    if (!activeTeam) return null;

    if (chatsToday >= chatLimit) {
      toast.error(
        chatLimit === Infinity
          ? "Could not create chat"
          : `You've started ${chatsToday}/${chatLimit} new conversations today. Resets at midnight UTC, or upgrade for more.`
      );
      return null;
    }

    const { data, error } = await supabase
      .from("brain_chats")
      .insert({ team_id: activeTeam.id, title: "New Chat", messages: [] })
      .select()
      .single();

    if (error) {
      // The client-side check above should have already caught a plan-limit
      // hit, but RLS is the real enforcement (migration 031) — a race between
      // two tabs, or a stale `chats` list, can still get here. Postgres RLS
      // rejections don't carry a distinguishable code from other insert
      // failures, so the message stays generic rather than guessing wrong.
      toast.error("Failed to create chat");
      return null;
    }

    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    emit("brain-chats");
    return data;
  }, [activeTeam, chatsToday, chatLimit, supabase]);

  const updateChat = useCallback(
    async (id: string, messages: ChatMessage[], title?: string) => {
      // Derive title from first user message if not provided
      const derivedTitle =
        title ??
        messages.find((m) => m.role === "user")?.content.slice(0, 40) ??
        "New Chat";

      const { error } = await supabase
        .from("brain_chats")
        .update({ messages, title: derivedTitle, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        console.error("Failed to save chat:", error.message);
        return;
      }

      setChats((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, messages: messages as unknown as typeof c.messages, title: derivedTitle, updated_at: new Date().toISOString() }
            : c
        )
      );
      emit("brain-chats");
    },
    [supabase]
  );

  const deleteChat = useCallback(
    async (id: string) => {
      // Optimistic remove
      setChats((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        // If deleting the active chat, switch to the next one
        setActiveChatId((current) => {
          if (current !== id) return current;
          return remaining.length > 0 ? remaining[0].id : null;
        });
        return remaining;
      });

      const { error } = await supabase.from("brain_chats").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete chat");
        fetchChats(); // restore on error
        return;
      }
      emit("brain-chats");
    },
    [supabase, fetchChats]
  );

  return {
    chats,
    loading,
    activeChatId,
    setActiveChatId,
    fetchChats,
    createChat,
    updateChat,
    deleteChat,
    canCreateChat,
    chatLimit,
    chatsToday,
  };
}
