"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { toast } from "sonner";
import type { Database } from "@/types/database";

export type Affiliate = Database["public"]["Tables"]["affiliates"]["Row"];
export type AffiliateReferral = Database["public"]["Tables"]["affiliate_referrals"]["Row"];
export type AffiliatePayout = Database["public"]["Tables"]["affiliate_payouts"]["Row"];

// Commission tiers based on active referrals
// 1 active → 10%, 2-5 active → 20%, 5-10 active → 30%
export function getCommissionRate(activeCount: number): number {
  if (activeCount >= 5) return 0.30;
  if (activeCount >= 2) return 0.20;
  if (activeCount >= 1) return 0.10;
  return 0;
}

export function getCommissionTier(activeCount: number): { label: string; percent: number; color: string } {
  if (activeCount >= 5) return { label: "Gold", percent: 30, color: "text-amber-400" };
  if (activeCount >= 2) return { label: "Silver", percent: 20, color: "text-slate-300" };
  if (activeCount >= 1) return { label: "Bronze", percent: 10, color: "text-amber-600" };
  return { label: "None", percent: 0, color: "text-neutral-500" };
}

export const COMMISSION_TIERS = [
  { min: 1, max: 1, percent: 10, label: "1 active referral", color: "from-amber-600 to-amber-700" },
  { min: 2, max: 5, percent: 20, label: "2-5 active referrals", color: "from-slate-300 to-slate-400" },
  { min: 5, max: 10, percent: 30, label: "5-10 active referrals", color: "from-amber-400 to-yellow-500" },
];

export function useAffiliate() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [referrals, setReferrals] = useState<AffiliateReferral[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const activeReferrals = useMemo(
    () => referrals.filter((r) => r.status === "active"),
    [referrals]
  );

  const pendingReferrals = useMemo(
    () => referrals.filter((r) => r.status === "pending"),
    [referrals]
  );

  const commissionRate = useMemo(
    () => getCommissionRate(activeReferrals.length),
    [activeReferrals.length]
  );

  const tier = useMemo(
    () => getCommissionTier(activeReferrals.length),
    [activeReferrals.length]
  );

  // Monthly recurring commission
  const monthlyCommission = useMemo(() => {
    return activeReferrals.reduce((sum, r) => sum + r.plan_price * commissionRate, 0);
  }, [activeReferrals, commissionRate]);

  const unpaidEarnings = useMemo(() => {
    if (!affiliate) return 0;
    return affiliate.total_earnings - affiliate.paid_earnings;
  }, [affiliate]);

  const fetchAffiliate = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("affiliates")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setAffiliate(data);

      // Fetch referrals
      const { data: refs } = await supabase
        .from("affiliate_referrals")
        .select("*")
        .eq("referrer_id", data.id)
        .order("created_at", { ascending: false });
      setReferrals(refs || []);

      // Fetch payouts
      const { data: pays } = await supabase
        .from("affiliate_payouts")
        .select("*")
        .eq("affiliate_id", data.id)
        .order("created_at", { ascending: false });
      setPayouts(pays || []);
    } else {
      setAffiliate(null);
      setReferrals([]);
      setPayouts([]);
    }

    setLoading(false);
  }, [user?.id, supabase]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    fetchAffiliate();

    channelRef.current = supabase
      .channel(`affiliate_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliates" }, () => fetchAffiliate())
      .on("postgres_changes", { event: "*", schema: "public", table: "affiliate_referrals" }, () => fetchAffiliate())
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id, supabase, fetchAffiliate]);

  const joinProgram = useCallback(async () => {
    if (!user?.id) return;

    // Generate unique referral code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await supabase
      .from("affiliates")
      .insert({
        user_id: user.id,
        referral_code: code,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("You are already in the affiliate program");
      } else {
        toast.error("Failed to join affiliate program");
        console.error(error);
      }
    } else {
      setAffiliate(data);
      toast.success("Welcome to the affiliate program!");
    }
  }, [user?.id, supabase]);

  const referralLink = useMemo(() => {
    if (!affiliate) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://tappr.me";
    return `${origin}/signup?ref=${affiliate.referral_code}`;
  }, [affiliate]);

  // Pyramid leaderboard — top 5 positions (FIFO rotation)
  const [pyramidLeaders, setPyramidLeaders] = useState<(Affiliate & { user_email?: string; user_name?: string })[]>([]);

  const fetchPyramid = useCallback(async () => {
    const { data } = await supabase
      .from("affiliates")
      .select("*, users!affiliates_user_id_fkey(email, full_name)")
      .not("pyramid_position", "is", null)
      .order("pyramid_position", { ascending: true })
      .limit(5);

    if (data) {
      setPyramidLeaders(
        data.map((a: any) => ({
          ...a,
          user_email: a.users?.email,
          user_name: a.users?.full_name,
        }))
      );
    }
  }, [supabase]);

  useEffect(() => {
    fetchPyramid();
  }, [fetchPyramid]);

  // Join pyramid when joining affiliate program (auto-assign next position)
  const joinPyramid = useCallback(async () => {
    if (!affiliate) return;
    if (affiliate.pyramid_position !== null) return; // already in pyramid

    // Count current pyramid members
    const { count } = await supabase
      .from("affiliates")
      .select("*", { count: "exact", head: true })
      .not("pyramid_position", "is", null);

    if ((count ?? 0) >= 5) {
      toast.error("Pyramid is full (5/5). Wait for a spot to open.");
      return;
    }

    const nextPosition = (count ?? 0) + 1;

    const { error } = await supabase
      .from("affiliates")
      .update({ pyramid_position: nextPosition, pyramid_joined_at: new Date().toISOString() })
      .eq("id", affiliate.id);

    if (error) {
      toast.error("Failed to join pyramid");
    } else {
      toast.success(`You're in position #${nextPosition}!`);
      fetchAffiliate();
      fetchPyramid();
    }
  }, [affiliate, supabase, fetchAffiliate, fetchPyramid]);

  // Rotate: person at #1 goes to #5, everyone shifts up
  const rotatePyramid = useCallback(async () => {
    if (!pyramidLeaders.length) return;

    const leader = pyramidLeaders[0]; // position #1
    const rest = pyramidLeaders.slice(1); // positions 2-5

    // Shift everyone up by 1
    for (const member of rest) {
      await supabase
        .from("affiliates")
        .update({ pyramid_position: member.pyramid_position! - 1 })
        .eq("id", member.id);
    }

    // Move #1 to last position
    await supabase
      .from("affiliates")
      .update({ pyramid_position: pyramidLeaders.length, pyramid_joined_at: new Date().toISOString() })
      .eq("id", leader.id);

    fetchPyramid();
  }, [pyramidLeaders, supabase, fetchPyramid]);

  return {
    affiliate,
    referrals,
    activeReferrals,
    pendingReferrals,
    payouts,
    loading,
    commissionRate,
    tier,
    monthlyCommission,
    unpaidEarnings,
    referralLink,
    joinProgram,
    fetchAffiliate,
    pyramidLeaders,
    joinPyramid,
    rotatePyramid,
  };
}
