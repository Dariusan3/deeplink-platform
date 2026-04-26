"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useUser } from "./use-user";
import { emit, subscribe } from "@/lib/refresh-bus";
import { toast } from "sonner";
import { Database } from "@/types/database";

export type BrainEntry = Database["public"]["Tables"]["business_brain"]["Row"];

export function useBusinessBrain() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchEntries = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("business_brain")
      .select("*")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching brain entries:", error.message);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      fetchEntries();
    }
  }, [activeTeam?.id, fetchEntries]);

  useEffect(() => {
    return subscribe("business-brain", () => fetchEntries());
  }, [fetchEntries]);

  const addEntry = useCallback(
    async (title: string, content: string) => {
      if (!activeTeam) throw new Error("No active team");

      const { data, error } = await supabase
        .from("business_brain")
        .insert({
          team_id: activeTeam.id,
          title,
          content: { text: content },
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to save knowledge");
        throw error;
      }

      setEntries((prev) => [data, ...prev]);
      emit("business-brain");
      toast.success("Knowledge saved");
      return data;
    },
    [activeTeam, supabase]
  );

  const updateEntry = useCallback(
    async (id: string, title: string, content: string) => {
      const { error } = await supabase
        .from("business_brain")
        .update({ title, content: { text: content }, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        toast.error("Failed to update");
        throw error;
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, title, content: { text: content }, updated_at: new Date().toISOString() } : e
        )
      );
      emit("business-brain");
      toast.success("Updated");
    },
    [supabase]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("business_brain").delete().eq("id", id);

      if (error) {
        toast.error("Failed to delete");
        throw error;
      }

      setEntries((prev) => prev.filter((e) => e.id !== id));
      emit("business-brain");
      toast.success("Knowledge removed");
    },
    [supabase]
  );

  // Build a plain text summary of all business context for AI
  const buildBusinessContext = useCallback(() => {
    if (entries.length === 0) return null;

    return entries
      .map((e) => {
        const text = typeof e.content === "object" && e.content !== null && "text" in (e.content as Record<string, unknown>)
          ? (e.content as { text: string }).text
          : JSON.stringify(e.content);
        return `### ${e.title || "Untitled"}\n${text}`;
      })
      .join("\n\n");
  }, [entries]);

  return {
    entries,
    loading,
    addEntry,
    updateEntry,
    deleteEntry,
    buildBusinessContext,
    fetchEntries,
  };
}
