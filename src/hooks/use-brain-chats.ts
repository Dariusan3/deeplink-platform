"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
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

  const canCreateChat = useMemo(
    () => chats.length < chatLimit,
    [chats.length, chatLimit]
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

  const createChat = useCallback(async (): Promise<BrainChat | null> => {
    if (!activeTeam) return null;

    if (chats.length >= chatLimit) {
      toast.error(
        chatLimit === Infinity
          ? "Could not create chat"
          : `Chat limit reached (${chats.length}/${chatLimit}). Upgrade your plan to save more chats.`
      );
      return null;
    }

    const { data, error } = await supabase
      .from("brain_chats")
      .insert({ team_id: activeTeam.id, title: "New Chat", messages: [] })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create chat");
      return null;
    }

    setChats((prev) => [data, ...prev]);
    setActiveChatId(data.id);
    return data;
  }, [activeTeam, chats.length, chatLimit, supabase]);

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
      }
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
  };
}
