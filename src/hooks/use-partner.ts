"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { emit, subscribe } from "@/lib/refresh-bus";
import { getDisplayOrigin } from "@/lib/url-normalize";
import { toast } from "sonner";
import type {
  PartnerProfile,
  PartnerReferral,
  PartnerEarning,
  PartnerPayout,
  PartnerPayoutMethod,
  PartnerCode,
} from "@/types/partner";

const REFRESH_KEY = "partner-data" as const;

export function usePartner() {
  const { user } = useUser();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [earnings, setEarnings] = useState<PartnerEarning[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
  const [codes, setCodes] = useState<PartnerCode[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data: profileRow } = await supabase
      .from("partner_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profileRow) {
      setProfile(null);
      setReferrals([]);
      setEarnings([]);
      setPayouts([]);
      setCodes([]);
      setLoading(false);
      return;
    }

    const partnerId = profileRow.id;

    const [{ data: refs }, { data: earns }, { data: pays }, { data: codeRows }] = await Promise.all([
      supabase
        .from("partner_referrals")
        .select("*")
        .eq("partner_id", partnerId)
        .order("signed_up_at", { ascending: false }),
      supabase
        .from("partner_earnings")
        .select("*")
        .eq("partner_id", partnerId)
        .order("period_month", { ascending: false }),
      supabase
        .from("partner_payouts")
        .select("*")
        .eq("partner_id", partnerId)
        .order("requested_at", { ascending: false }),
      supabase
        .from("partner_codes")
        .select("code, is_primary, created_at")
        .eq("partner_id", partnerId)
        .order("created_at", { ascending: false }),
    ]);

    setProfile(profileRow as PartnerProfile);
    setReferrals((refs || []) as PartnerReferral[]);
    setEarnings((earns || []) as PartnerEarning[]);
    setPayouts((pays || []) as PartnerPayout[]);
    setCodes((codeRows || []) as PartnerCode[]);
    setLoading(false);
  }, [user?.id, supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Cross-instance refresh — every mutation `emit("partner-data")` triggers
  // a refetch in every hook consumer.
  useEffect(() => {
    return subscribe(REFRESH_KEY, () => fetchAll());
  }, [fetchAll]);

  // Realtime subscription for live referral notifications.
  useEffect(() => {
    if (!profile?.id) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase
      .channel(`partner-realtime-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "partner_referrals",
          filter: `partner_id=eq.${profile.id}`,
        },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          fetchAll();
          if (payload.eventType === "INSERT") {
            toast.success("New signup through your referral link!");
          }
          if (payload.eventType === "UPDATE") {
            const newRow = payload.new as PartnerReferral;
            const oldRow = payload.old as PartnerReferral;
            if (oldRow.status !== "active" && newRow.status === "active") {
              toast.success(
                `Referral converted! +€${newRow.monthly_value * (profile.commission_rate || 0.5)}/mo`
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "partner_payouts",
          filter: `partner_id=eq.${profile.id}`,
        },
        (payload: { new: unknown }) => {
          const row = payload.new as PartnerPayout;
          if (row.status === "paid") {
            toast.success(`Payout processed: €${row.amount}`);
            fetchAll();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.commission_rate, supabase, fetchAll]);

  // ─── Mutations ────────────────────────────────────────────

  const updatePayoutMethod = useCallback(
    async (method: PartnerPayoutMethod) => {
      if (!profile) throw new Error("No partner profile");
      const { error } = await supabase
        .from("partner_profiles")
        .update({ payout_method: method })
        .eq("id", profile.id);
      if (error) {
        toast.error(error.message || "Failed to save payment method");
        throw error;
      }
      setProfile({ ...profile, payout_method: method });
      emit(REFRESH_KEY);
      toast.success("Payment method saved");
    },
    [profile, supabase]
  );

  // Set the partner's custom code. Refetches rather than patching state
  // locally, because the server normalises the code (lowercase, trimmed) and
  // demotes the previous primary — two changes the client shouldn't guess at.
  const setVanityCode = useCallback(
    async (code: string) => {
      const res = await fetch("/api/partner/vanity-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data.error || "Failed to save code";
        toast.error(message);
        throw new Error(message);
      }
      await fetchAll();
      emit(REFRESH_KEY);
      toast.success("Referral link updated");
      return data.code as string;
    },
    [fetchAll]
  );

  const requestPayout = useCallback(
    async (amount: number) => {
      const res = await fetch("/api/partner/payout-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to request payout");
        throw new Error(data.error);
      }
      emit(REFRESH_KEY);
      toast.success("Payout requested");
    },
    []
  );

  // ─── Derived values ──────────────────────────────────────

  const activeReferrals = referrals.filter((r) => r.status === "active");
  const churnedReferrals = referrals.filter((r) => r.status === "churned");
  const monthlyMrr = activeReferrals.reduce((sum, r) => sum + Number(r.monthly_value), 0);
  const monthlyCommission = monthlyMrr * (profile?.commission_rate ?? 0.5);

  const conversionRate = referrals.length > 0
    ? activeReferrals.length / referrals.length
    : 0;

  // The code shown as "your link". Falls back to partner_profiles.referral_code
  // so the URL is never blank while partner_codes is still loading, or for a
  // profile whose code row somehow never got written.
  const primaryCode = useMemo(
    () => codes.find((c) => c.is_primary)?.code ?? profile?.referral_code ?? "",
    [codes, profile?.referral_code]
  );

  const referralUrl = useMemo(() => {
    if (!primaryCode) return "";
    // Clean, path-based referral link: /signup/CODE. It renders the signup
    // page directly (no redirect, no ?ref= in the URL) and records the click —
    // see src/app/(auth)/signup/[code]/page.tsx.
    //
    // The older /signup/@CODE shape is still live everywhere it was ever
    // posted; that route strips leading @ characters, so nothing breaks. Only
    // what we display and copy from here on has changed.
    return `${getDisplayOrigin()}/signup/${primaryCode}`;
  }, [primaryCode]);

  return {
    profile,
    codes,
    primaryCode,
    referrals,
    activeReferrals,
    churnedReferrals,
    earnings,
    payouts,
    loading,
    monthlyMrr,
    monthlyCommission,
    conversionRate,
    referralUrl,
    refresh: fetchAll,
    setVanityCode,
    updatePayoutMethod,
    requestPayout,
  };
}
