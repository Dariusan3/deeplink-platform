"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartner } from "@/hooks/use-partner";
import { Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTNER_MIN_PAYOUT as MIN_PAYOUT } from "@/lib/partner-config";

export default function PartnerEarningsPage() {
  const { profile, earnings, payouts, requestPayout, activeReferrals } = usePartner();
  const [requestAmount, setRequestAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Last 12 months of earnings, bucketed by period_month
  const monthlyEarnings = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, 0);
    }
    for (const e of earnings) {
      const key = e.period_month.slice(0, 7);
      if (m.has(key)) m.set(key, (m.get(key) ?? 0) + Number(e.amount));
    }
    return [...m.entries()].map(([month, amount]) => ({ month, amount }));
  }, [earnings]);

  const maxAmount = Math.max(1, ...monthlyEarnings.map((d) => d.amount));

  const handleRequest = async () => {
    const amt = Number(requestAmount);
    if (!amt || amt < MIN_PAYOUT) return;
    setSubmitting(true);
    try {
      await requestPayout(amt);
      setRequestAmount("");
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const pending = Number(profile?.pending_payout ?? 0);
  const canRequest = pending >= MIN_PAYOUT && profile?.payout_method;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Earnings</h1>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="glass-card border-[#00D26A]/20 bg-[#00D26A]/5">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#00D26A]">Pending Payout</p>
            <p className="text-3xl font-black text-[#00D26A] mt-1">${pending.toFixed(2)}</p>

            {/* Progress to threshold — same visual story as the overview banner */}
            {(() => {
              const ready = pending >= MIN_PAYOUT;
              const pct = Math.min(100, Math.max(0, (pending / MIN_PAYOUT) * 100));
              const remaining = Math.max(0, MIN_PAYOUT - pending);
              return (
                <>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${ready ? "bg-[#00D26A] shadow-[0_0_10px_rgba(0,210,106,0.45)]" : "bg-[#00D26A]/60"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2">
                    {ready
                      ? `Above the $${MIN_PAYOUT} minimum — ready to withdraw`
                      : `$${remaining.toFixed(2)} more to reach $${MIN_PAYOUT} minimum`}
                  </p>
                </>
              );
            })()}
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Total Earned</p>
            <p className="text-3xl font-black text-white mt-1">${Number(profile?.total_earned ?? 0).toFixed(2)}</p>
            <p className="text-[10px] text-neutral-500 mt-1">All-time, all paid</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Active Referrals</p>
            <p className="text-3xl font-black text-white mt-1">{activeReferrals.length}</p>
            <p className="text-[10px] text-neutral-500 mt-1">{(profile?.commission_rate ?? 0.25) * 100}% recurring</p>
          </CardContent>
        </Card>
      </div>

      {/* 12-month chart */}
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00D26A]" />
            Earnings · Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {monthlyEarnings.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full bg-[#00D26A]/20 hover:bg-[#00D26A]/40 rounded-t transition-all relative" style={{ height: `${(m.amount / maxAmount) * 100}%`, minHeight: m.amount > 0 ? 2 : 0 }}>
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-black px-1.5 py-0.5 rounded whitespace-nowrap">
                    ${m.amount.toFixed(0)}
                  </div>
                </div>
                <span className="text-[8px] font-black text-neutral-500 uppercase">{m.month.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout request + history */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#00D26A]" />
              Request Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!profile?.payout_method ? (
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="text-xs font-bold text-amber-400 mb-2">Set a payout method first</p>
                <Link href="/partner/settings" className="text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300">
                  Open Settings →
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Amount (USD)</Label>
                  <Input
                    type="number"
                    min={MIN_PAYOUT}
                    max={pending}
                    placeholder={`${MIN_PAYOUT}`}
                    value={requestAmount}
                    onChange={(e) => setRequestAmount(e.target.value)}
                    className="bg-white/[0.02] border-white/10 h-11"
                  />
                  <p className="text-[10px] text-neutral-500">Available: ${pending.toFixed(2)} · Min ${MIN_PAYOUT}</p>
                </div>
                <Button
                  onClick={handleRequest}
                  disabled={submitting || !canRequest || !requestAmount || Number(requestAmount) < MIN_PAYOUT || Number(requestAmount) > pending}
                  className={cn(
                    "w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs",
                    canRequest ? "bg-[#00D26A] hover:bg-[#00D26A]/90 text-black" : "bg-white/5 text-neutral-600 cursor-not-allowed"
                  )}
                >
                  {submitting ? "Requesting..." : "Request Payout"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No payouts yet</p>
            ) : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm font-black text-white">${Number(p.amount).toFixed(2)}</p>
                      <p className="text-[9px] text-neutral-500">
                        {new Date(p.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {p.method ? ` · ${p.method}` : ""}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                      p.status === "paid" && "bg-[#00D26A]/10 text-[#00D26A]",
                      p.status === "requested" && "bg-amber-500/10 text-amber-400",
                      p.status === "rejected" && "bg-red-500/10 text-red-400"
                    )}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
