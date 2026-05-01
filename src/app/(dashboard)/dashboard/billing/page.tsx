"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/use-team";
import { createClient } from "@/lib/supabase/client";
import { CreditCard, Calendar, ArrowUpRight, Crown, Zap, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Subscription = {
  id: string;
  team_id: string;
  plan: "free" | "starter" | "growth" | "agency";
  status: "active" | "cancelled" | "expired" | "trial";
  is_free: boolean;
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
};

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 89,
  growth: 189,
  agency: 389,
};

const PLAN_STYLES: Record<string, { label: string; tint: string; text: string; border: string; icon: typeof Crown }> = {
  free:    { label: "Free",    tint: "bg-neutral-700/40", text: "text-neutral-300", border: "border-neutral-600/40", icon: Sparkles },
  starter: { label: "Starter", tint: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30",   icon: Zap },
  growth:  { label: "Growth",  tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",   border: "border-[#00D26A]/30",  icon: Sparkles },
  agency:  { label: "Agency",  tint: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",  icon: Crown },
};

export default function BillingPage() {
  const { activeTeam } = useTeam();
  const supabase = useMemo(() => createClient(), []);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!activeTeam?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("team_id", activeTeam.id)
      .order("created_at", { ascending: false });

    const rows = (data || []) as Subscription[];
    const active = rows.find((r) => r.status === "active") ?? null;
    setCurrent(active);
    setHistory(rows);
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const plan = (current?.plan ?? activeTeam?.plan ?? "free") as keyof typeof PLAN_STYLES;
  const style = PLAN_STYLES[plan];
  const PlanIcon = style.icon;
  const monthlyPrice = PLAN_PRICES[plan];

  const renewsLabel = (() => {
    if (!current) return "—";
    if (current.is_free) return "Granted (no charge)";
    if (current.expires_at) return new Date(current.expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    return "Open-ended";
  })();

  const handleCancel = async () => {
    if (!current || current.is_free) return;
    if (!window.confirm("Cancel your active subscription? You'll keep access until the end of the current period.")) return;
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", current.id);
    if (error) {
      toast.error(error.message || "Failed to cancel");
      return;
    }
    toast.success("Subscription cancelled");
    fetchAll();
  };

  return (
    <div className="space-y-6 p-6">
      <Header title="Billing" />

      <div className="max-w-4xl mx-auto w-full space-y-6 pb-20">
        {/* Current plan card */}
        <Card className={cn("glass-card border", style.border)}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl border", style.tint, style.border)}>
                  <PlanIcon className={cn("w-6 h-6", style.text)} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Current Plan</p>
                  <h2 className={cn("text-2xl font-black tracking-tighter", style.text)}>{style.label}</h2>
                  <p className="text-sm text-neutral-400 mt-1">
                    {plan === "free"
                      ? "500 clicks/month, all routing rules, limited AI."
                      : `$${monthlyPrice}/month · billed monthly`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {plan === "free" ? (
                  <Button render={<Link href="/pricing" />} nativeButton={false} className="btn-primary-pulse h-10 px-5 rounded-xl text-black font-black uppercase text-xs tracking-widest gap-2">
                    Upgrade
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <>
                    <Button render={<Link href="/pricing" />} nativeButton={false} variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A]">
                      Change Plan
                    </Button>
                    {!current?.is_free && (
                      <Button onClick={handleCancel} variant="outline" className="h-10 rounded-xl border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 text-[10px] font-black uppercase tracking-widest">
                        Cancel
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Renewal / status row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/5">
              <Stat label="Status" value={current ? capital(current.status) : "—"} />
              <Stat label="Renews" value={renewsLabel} />
              <Stat label="Started" value={current ? new Date(current.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
            </div>

            {current?.is_free && (
              <div className="mt-5 flex items-start gap-3 p-3 rounded-lg bg-[#00D26A]/5 border border-[#00D26A]/20">
                <Sparkles className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-300">
                  This plan was granted to you by an admin — no charge.
                  {current.notes ? <span className="text-neutral-500"> · {current.notes}</span> : null}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment method placeholder */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00D26A]" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-white">No payment method on file</p>
                  <p className="text-[11px] text-neutral-500">Stripe checkout will collect a card when you upgrade.</p>
                </div>
              </div>
              <Button render={<Link href="/pricing" />} nativeButton={false} variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A]">
                {plan === "free" ? "Upgrade to add" : "Manage"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription history */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#00D26A]" />
              Subscription History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-white/[0.02] rounded animate-pulse" />)}
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No subscription records yet — you&apos;re on the free plan.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s) => {
                  const sStyle = PLAN_STYLES[s.plan];
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-3 py-3 px-3 border-b border-white/5 last:border-0 rounded-lg hover:bg-white/[0.02]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest", sStyle.tint, sStyle.text, sStyle.border)}>
                          {sStyle.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">
                            {s.is_free ? "Granted" : `$${PLAN_PRICES[s.plan]}/mo`}
                            {" · "}
                            {capital(s.status)}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {new Date(s.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {s.expires_at && (
                              <> → {new Date(s.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                        s.status === "active" && "bg-[#00D26A]/10 text-[#00D26A]",
                        s.status === "cancelled" && "bg-red-500/10 text-red-400",
                        s.status === "expired" && "bg-neutral-700/40 text-neutral-400",
                        s.status === "trial" && "bg-amber-500/10 text-amber-400"
                      )}>
                        {s.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help row */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-bold text-white">Need a custom plan or invoice?</p>
              <p className="text-[11px] text-neutral-500">We tailor pricing for agencies and high-volume teams.</p>
            </div>
            <Button render={<Link href="/dashboard/contact" />} nativeButton={false} variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/10 hover:text-[#00D26A]">
              Contact us
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="text-sm font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
