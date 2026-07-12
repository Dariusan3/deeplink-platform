"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { useTeam } from "@/hooks/use-team";
import { revalidateSlugCache } from "@/lib/revalidate-slug";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type ABTest = Database["public"]["Tables"]["ab_tests"]["Row"];
type ABTestInsert = Database["public"]["Tables"]["ab_tests"]["Insert"];
type ABTestUpdate = Database["public"]["Tables"]["ab_tests"]["Update"];
export type ABTestEvent = Database["public"]["Tables"]["ab_test_events"]["Row"];

export function useABTests() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchTests = useCallback(async () => {
    if (!activeTeam?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("ab_tests")
      .select("*")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching A/B tests:", error);
    } else {
      setTests(data || []);
    }
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!activeTeam?.id) return;
    fetchTests();

    channelRef.current = supabase
      .channel(`ab_tests_${activeTeam.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ab_tests", filter: `team_id=eq.${activeTeam.id}` },
        () => fetchTests()
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [activeTeam?.id, supabase, fetchTests]);

  const createTest = useCallback(
    async (payload: { name: string; slug: string; variant_a_url: string; variant_b_url: string; variant_a_name?: string; variant_b_name?: string; auto_optimize?: boolean; min_conversions?: number; threshold_percent?: number; cost_per_click?: number }) => {
      if (!activeTeam?.id || !user?.id) return;

      const { error } = await supabase.from("ab_tests").insert({
        team_id: activeTeam.id,
        created_by: user.id,
        name: payload.name,
        slug: payload.slug,
        variant_a_url: payload.variant_a_url,
        variant_b_url: payload.variant_b_url,
        variant_a_name: payload.variant_a_name || "Variant A",
        variant_b_name: payload.variant_b_name || "Variant B",
        auto_optimize: payload.auto_optimize ?? false,
        min_conversions: payload.min_conversions ?? 100,
        threshold_percent: payload.threshold_percent ?? 20,
        cost_per_click: payload.cost_per_click ?? 0,
        status: "running",
      } as ABTestInsert);

      if (error) {
        toast.error("Failed to create A/B test");
        console.error(error);
      } else {
        toast.success("A/B test created");
        revalidateSlugCache({ slugs: [payload.slug] });
      }
    },
    [activeTeam?.id, user?.id, supabase]
  );

  const updateTest = useCallback(
    async (id: string, payload: ABTestUpdate) => {
      // An edit can rename the slug, so the old one has to be purged too.
      const previousSlug = tests.find((t) => t.id === id)?.slug;

      const { error } = await supabase
        .from("ab_tests")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        toast.error("Failed to update A/B test");
        console.error(error);
      } else {
        toast.success("A/B test updated");
        revalidateSlugCache({ slugs: [previousSlug, payload.slug] });
      }
    },
    [supabase, tests]
  );

  const deleteTest = useCallback(
    async (id: string) => {
      const previousSlug = tests.find((t) => t.id === id)?.slug;

      const { error } = await supabase.from("ab_tests").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete A/B test");
        console.error(error);
      } else {
        toast.success("A/B test deleted");
        setTests((prev) => prev.filter((t) => t.id !== id));
        revalidateSlugCache({ slugs: [previousSlug] });
      }
    },
    [supabase, tests]
  );

  const selectWinner = useCallback(
    async (id: string, winner: "a" | "b") => {
      const { error } = await supabase
        .from("ab_tests")
        .update({
          winner,
          winner_selected_at: new Date().toISOString(),
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to select winner");
      } else {
        toast.success(`Winner selected: Variant ${winner.toUpperCase()}`);
        // Picking a winner flips the redirect from a 50/50 split to 100% of
        // traffic on one variant — the resolver has to see it immediately.
        revalidateSlugCache({ slugs: [tests.find((t) => t.id === id)?.slug] });
      }
    },
    [supabase, tests]
  );

  const fetchEvents = useCallback(
    async (testId: string) => {
      const { data, error } = await supabase
        .from("ab_test_events")
        .select("*")
        .eq("test_id", testId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error);
        return [];
      }
      return data || [];
    },
    [supabase]
  );

  return {
    tests,
    loading,
    fetchTests,
    createTest,
    updateTest,
    deleteTest,
    selectWinner,
    fetchEvents,
  };
}
