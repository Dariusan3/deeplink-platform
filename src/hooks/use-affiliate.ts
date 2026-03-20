"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";
import { Database } from "@/types/database";

export type AffiliateEntry = Database["public"]["Tables"]["affiliate_queue"]["Row"] & {
  user?: { full_name: string | null; email: string; avatar_url: string | null } | null;
};
export type AffiliateReferral = Database["public"]["Tables"]["affiliate_referrals"]["Row"];

const PYRAMID_SIZE = 5;
const COMMISSION_PERCENT = 25;

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useAffiliate() {
  const { user } = useUser();
  const [queue, setQueue] = useState<AffiliateEntry[]>([]);
  const [myEntry, setMyEntry] = useState<AffiliateEntry | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Fetch full queue (pyramid + waitlist)
  const fetchQueue = useCallback(async () => {
    const { data, error } = await supabase
      .from("affiliate_queue")
      .select("*, user:users(full_name, email, avatar_url)")
      .eq("is_active", true)
      .order("position", { ascending: true, nullsFirst: false })
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching affiliate queue:", error.message);
      return;
    }

    // Sort: positions 1-5 first (by position), then waitlist (by joined_at)
    const withPosition = (data || []).filter((e: AffiliateEntry) => e.position !== null)
      .sort((a: AffiliateEntry, b: AffiliateEntry) => (a.position || 0) - (b.position || 0));
    const waitlist = (data || []).filter((e: AffiliateEntry) => e.position === null)
      .sort((a: AffiliateEntry, b: AffiliateEntry) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

    setQueue([...withPosition, ...waitlist] as AffiliateEntry[]);
  }, [supabase]);

  // Fetch my entry
  const fetchMyEntry = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("affiliate_queue")
      .select("*, user:users(full_name, email, avatar_url)")
      .eq("user_id", user.id)
      .single();

    setMyEntry((data as AffiliateEntry) || null);
  }, [user, supabase]);

  // Fetch my referrals
  const fetchReferrals = useCallback(async () => {
    if (!myEntry) return;

    const { data } = await supabase
      .from("affiliate_referrals")
      .select("*")
      .eq("referrer_id", myEntry.id)
      .order("created_at", { ascending: false });

    setReferrals((data || []) as AffiliateReferral[]);
  }, [myEntry, supabase]);

  // Load all data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchQueue();
      await fetchMyEntry();
      setLoading(false);
    };
    load();
  }, [fetchQueue, fetchMyEntry]);

  useEffect(() => {
    if (myEntry) fetchReferrals();
  }, [myEntry, fetchReferrals]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("affiliate-queue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "affiliate_queue" },
        () => {
          fetchQueue();
          fetchMyEntry();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchQueue, fetchMyEntry]);

  // Join the affiliate program
  const joinProgram = useCallback(async () => {
    if (!user) throw new Error("Must be logged in");
    if (myEntry) {
      toast.error("You're already in the affiliate program");
      return;
    }

    // Count active entries with positions
    const activeInPyramid = queue.filter((e) => e.position !== null).length;
    const position = activeInPyramid < PYRAMID_SIZE ? activeInPyramid + 1 : null;

    const { data, error } = await supabase
      .from("affiliate_queue")
      .insert({
        user_id: user.id,
        referral_code: generateReferralCode(),
        position,
      })
      .select("*, user:users(full_name, email, avatar_url)")
      .single();

    if (error) {
      toast.error(error.message || "Failed to join");
      throw error;
    }

    setMyEntry(data as AffiliateEntry);
    toast.success(
      position
        ? `You're in the pyramid at position #${position}!`
        : "You've joined the waitlist!"
    );
    fetchQueue();
  }, [user, myEntry, queue, supabase, fetchQueue]);

  // Leave the program (FIFO: next in waitlist gets promoted)
  const leaveProgram = useCallback(async () => {
    if (!myEntry) return;

    const myPosition = myEntry.position;

    // Deactivate my entry
    await supabase
      .from("affiliate_queue")
      .update({ is_active: false, position: null })
      .eq("id", myEntry.id);

    // If I was in the pyramid, shift everyone up and promote from waitlist
    if (myPosition !== null) {
      // Get active pyramid members above my position
      const aboveMe = queue.filter(
        (e) => e.position !== null && e.position > myPosition && e.id !== myEntry.id
      );

      // Shift each one up by 1
      for (const entry of aboveMe) {
        await supabase
          .from("affiliate_queue")
          .update({ position: (entry.position || 0) - 1 })
          .eq("id", entry.id);
      }

      // Find next waitlister
      const waitlist = queue.filter((e) => e.position === null && e.id !== myEntry.id);
      if (waitlist.length > 0) {
        const next = waitlist[0];
        const newLastPosition = queue.filter(
          (e) => e.position !== null && e.id !== myEntry.id
        ).length + 1;

        await supabase
          .from("affiliate_queue")
          .update({ position: Math.min(newLastPosition, PYRAMID_SIZE) })
          .eq("id", next.id);
      }
    }

    setMyEntry(null);
    toast.success("You've left the affiliate program");
    fetchQueue();
  }, [myEntry, queue, supabase, fetchQueue]);

  // Derived data
  const pyramidMembers = queue.filter((e) => e.position !== null).slice(0, PYRAMID_SIZE);
  const waitlist = queue.filter((e) => e.position === null);
  const myPosition = myEntry?.position ?? null;
  const isInPyramid = myPosition !== null && myPosition >= 1 && myPosition <= PYRAMID_SIZE;
  const waitlistPosition = !isInPyramid && myEntry
    ? waitlist.findIndex((e) => e.id === myEntry.id) + 1
    : null;

  const stats = useMemo(() => {
    if (!myEntry) return { earnings: 0, referralCount: 0, converted: 0, pending: 0 };
    return {
      earnings: myEntry.total_earnings || 0,
      referralCount: referrals.length,
      converted: referrals.filter((r) => r.status === "converted" || r.status === "paid").length,
      pending: referrals.filter((r) => r.status === "pending").length,
    };
  }, [myEntry, referrals]);

  const referralLink = myEntry
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${myEntry.referral_code}`
    : null;

  return {
    queue,
    pyramidMembers,
    waitlist,
    myEntry,
    myPosition,
    isInPyramid,
    waitlistPosition,
    referrals,
    referralLink,
    stats,
    loading,
    joinProgram,
    leaveProgram,
    PYRAMID_SIZE,
    COMMISSION_PERCENT,
  };
}
