"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePartner } from "@/hooks/use-partner";
import {
  TrendingUp, Users, Wallet, Target, Copy, Check, ArrowRight, Sparkles, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { PARTNER_MIN_PAYOUT } from "@/lib/partner-config";

export default function PartnerOverviewPage() {
  const {
    profile, referrals, activeReferrals, earnings, loading,
    monthlyCommission, conversionRate, referralUrl,
  } = usePartner();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-white/[0.03] rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white/[0.02] rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card className="glass-card border-white/5">
          <CardContent className="p-12 text-center">
            <Trophy className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-sm text-neutral-500">Partner profile not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const thisMonth = new Date().toISOString().slice(0, 7);
  const earnedThisMonth = earnings
    .filter(e => e.period_month.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Overview</h1>
      </div>

      {/* Payout progress / withdraw banner — always visible. Shows
          progress toward the $500 minimum until it's hit, then flips
          to a "ready to withdraw" state. */}
      <PayoutProgressCard pending={Number(profile.pending_payout)} />


      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20">
              <Wallet className="w-5 h-5 text-[#00D26A]" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#00D26A]">${earnedThisMonth.toFixed(0)}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">${Number(profile.total_earned).toFixed(0)}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">All-Time</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{activeReferrals.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Active Referrals</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Target className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{(conversionRate * 100).toFixed(1)}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Conversion</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral link quick-copy */}
        <Card className="glass-card border-white/5 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00D26A]" />
              Your Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-sm text-[#00D26A] truncate">
                {referralUrl}
              </div>
              <Button
                onClick={copyLink}
                className={copied ? "bg-[#00D26A] text-black h-11 px-4" : "bg-white/5 hover:bg-white/10 text-white h-11 px-4"}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3">
              Earn <span className="text-[#00D26A] font-black">{(profile.commission_rate * 100).toFixed(0)}%</span> recurring on every paying customer.
              Projected income from active referrals: <span className="text-white font-black">${monthlyCommission.toFixed(2)}/mo</span>
            </p>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="glass-card border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No activity yet — share your link to get started.</p>
            ) : (
              <div className="space-y-2">
                {referrals.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{r.referred_email}</p>
                      <p className="text-[9px] text-neutral-500">{r.plan ? `${r.plan} — $${r.monthly_value}/mo` : "No plan yet"}</p>
                    </div>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      r.status === "active" ? "bg-[#00D26A]/10 text-[#00D26A]" :
                      r.status === "churned" ? "bg-red-500/10 text-red-400" :
                      "bg-amber-500/10 text-amber-400"
                    }`}>
                      {r.status}
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

function PayoutProgressCard({ pending }: { pending: number }) {
  const ready = pending >= PARTNER_MIN_PAYOUT;
  const pct = Math.min(100, Math.max(0, (pending / PARTNER_MIN_PAYOUT) * 100));
  const remaining = Math.max(0, PARTNER_MIN_PAYOUT - pending);

  return (
    <Card className={`glass-card ${ready ? "border-[#00D26A]/30 bg-[#00D26A]/5" : "border-white/5"}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Wallet className={`w-5 h-5 ${ready ? "text-[#00D26A]" : "text-neutral-500"}`} />
            <div>
              {ready ? (
                <>
                  <p className="text-sm font-black text-white">${pending.toFixed(2)} ready to withdraw</p>
                  <p className="text-[10px] text-neutral-400">Above the ${PARTNER_MIN_PAYOUT} minimum — request a payout anytime</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-white">
                    ${pending.toFixed(2)}{" "}
                    <span className="text-neutral-500 font-bold">/ ${PARTNER_MIN_PAYOUT}</span>
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    ${remaining.toFixed(2)} more to unlock your first payout
                  </p>
                </>
              )}
            </div>
          </div>
          {ready ? (
            <Button render={<Link href="/partner/earnings" />} nativeButton={false} className="bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-[10px] tracking-widest h-9 px-4">
              Request Payout
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              {pct.toFixed(0)}% there
            </span>
          )}
        </div>

        {/* Progress bar — green fill when ready, neutral while climbing */}
        <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${ready ? "bg-[#00D26A] shadow-[0_0_12px_rgba(0,210,106,0.5)]" : "bg-[#00D26A]/60"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Tick marks at 25 / 50 / 75 / 100% for context */}
        <div className="mt-2 flex justify-between text-[9px] font-mono text-neutral-600">
          <span>$0</span>
          <span>${(PARTNER_MIN_PAYOUT * 0.25).toFixed(0)}</span>
          <span>${(PARTNER_MIN_PAYOUT * 0.5).toFixed(0)}</span>
          <span>${(PARTNER_MIN_PAYOUT * 0.75).toFixed(0)}</span>
          <span className={ready ? "text-[#00D26A]" : ""}>${PARTNER_MIN_PAYOUT}</span>
        </div>
      </CardContent>
    </Card>
  );
}
