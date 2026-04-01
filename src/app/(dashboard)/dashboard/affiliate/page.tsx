"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useAffiliate,
  COMMISSION_TIERS,
  AffiliateReferral,
} from "@/hooks/use-affiliate";
import {
  Copy,
  Check,
  DollarSign,
  Users,
  UserCheck,
  TrendingUp,
  Crown,
  Sparkles,
  ArrowRight,
  Clock,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function TierCard({
  tier,
  isActive,
}: {
  tier: (typeof COMMISSION_TIERS)[number];
  isActive: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all",
        isActive
          ? "bg-gradient-to-br border-[#00D26A]/30 shadow-[0_0_20px_rgba(0,210,106,0.1)]"
          : "border-white/5 bg-white/[0.01]"
      )}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2">
          <span className="text-[9px] font-black bg-[#00D26A] text-black px-2 py-0.5 rounded-full">
            CURRENT
          </span>
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
            tier.color
          )}
        >
          <span className="text-sm font-black text-black">
            {tier.percent}%
          </span>
        </div>
        <div>
          <p className="text-2xl font-black text-white">{tier.percent}%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            commission
          </p>
        </div>
      </div>
      <p className="text-xs text-neutral-400 font-medium">{tier.label}</p>
    </div>
  );
}

function ReferralRow({ referral }: { referral: AffiliateReferral }) {
  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    active: {
      color: "text-[#00D26A]",
      bg: "bg-[#00D26A]/10",
      label: "Active",
    },
    pending: {
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      label: "Pending",
    },
    churned: {
      color: "text-red-400",
      bg: "bg-red-400/10",
      label: "Churned",
    },
  };

  const status = statusConfig[referral.status] || statusConfig.pending;

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <span className="text-xs font-black text-neutral-400">
            {referral.referred_email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {referral.referred_email}
          </p>
          <p className="text-[10px] text-neutral-500">
            {referral.plan
              ? `${referral.plan.charAt(0).toUpperCase() + referral.plan.slice(1)} — $${referral.plan_price}/mo`
              : "No plan yet"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {referral.status === "active" && (
          <span className="text-xs font-bold text-[#00D26A]">
            ${(referral.plan_price * referral.commission_rate).toFixed(0)}/mo
          </span>
        )}
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
            status.color,
            status.bg
          )}
        >
          {status.label}
        </span>
      </div>
    </div>
  );
}

export default function AffiliatePage() {
  const {
    affiliate,
    referrals,
    activeReferrals,
    pendingReferrals,
    loading,
    tier,
    monthlyCommission,
    unpaidEarnings,
    referralLink,
    joinProgram,
    pyramidLeaders,
    joinPyramid,
  } = useAffiliate();

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Affiliate Program" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Not yet joined
  if (!affiliate) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Affiliate Program" />

        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mx-auto mb-6">
            <DollarSign className="w-8 h-8 text-[#00D26A]" />
          </div>
          <h2 className="text-3xl font-black mb-3">
            Earn Recurring Commissions
          </h2>
          <p className="text-neutral-400 mb-8 max-w-md mx-auto">
            Refer paying users and earn up to 30% of their monthly subscription
            — for life. The more active referrals you have, the higher your
            commission rate.
          </p>

          {/* Tier Preview */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto mb-8">
            {COMMISSION_TIERS.map((t) => (
              <TierCard key={t.percent} tier={t} isActive={false} />
            ))}
          </div>

          <div className="space-y-3 text-left max-w-md mx-auto mb-8">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00D26A]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-[#00D26A]">
                  1
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                Share your unique referral link with potential users
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00D26A]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-[#00D26A]">
                  2
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                When they sign up and subscribe, they become your active referral
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#00D26A]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-black text-[#00D26A]">
                  3
                </span>
              </div>
              <p className="text-sm text-neutral-400">
                Earn a % of their subscription every month — commission rate
                grows as you refer more
              </p>
            </div>
          </div>

          <Button
            onClick={joinProgram}
            className="h-12 px-8 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black uppercase text-xs tracking-widest"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Join Affiliate Program
          </Button>
        </div>
      </div>
    );
  }

  // Joined — show dashboard
  return (
    <div className="space-y-6 p-6">
      <Header title="Affiliate Program" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20">
              <TrendingUp className="w-5 h-5 text-[#00D26A]" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#00D26A]">
                {tier.percent}%
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Commission Rate
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <UserCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-black">
                {activeReferrals.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Active Referrals
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#00D26A]">
                ${monthlyCommission.toFixed(0)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Monthly Income
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Wallet className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-black">
                ${unpaidEarnings.toFixed(0)}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                Unpaid Earnings
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FIFO Pyramid Leaderboard */}
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              Affiliate Pyramid — Top 5
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                {pyramidLeaders.length}/5 spots filled
              </span>
              {affiliate && affiliate.pyramid_position === null && pyramidLeaders.length < 5 && (
                <Button
                  onClick={joinPyramid}
                  size="sm"
                  className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-[#00D26A] hover:bg-[#00D26A]/90 text-black"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Join Pyramid
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pyramidLeaders.length === 0 ? (
            <div className="text-center py-6">
              <Crown className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500 font-medium">No one in the pyramid yet</p>
              <p className="text-xs text-neutral-600">Be the first to claim position #1</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              {pyramidLeaders.map((leader, i) => {
                const isMe = leader.id === affiliate?.id;
                const posColors = [
                  "from-amber-400 to-yellow-500 border-amber-400/30",
                  "from-slate-300 to-slate-400 border-slate-300/30",
                  "from-amber-600 to-amber-700 border-amber-600/30",
                  "from-neutral-400 to-neutral-500 border-neutral-400/30",
                  "from-neutral-500 to-neutral-600 border-neutral-500/30",
                ];
                // Pyramid widths: #1 widest, #5 narrowest
                const widths = ["w-full", "w-[90%]", "w-[80%]", "w-[70%]", "w-[60%]"];

                return (
                  <div
                    key={leader.id}
                    className={cn(
                      "relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                      widths[i],
                      isMe
                        ? "bg-[#00D26A]/5 border-[#00D26A]/20 shadow-[0_0_15px_rgba(0,210,106,0.1)]"
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                      posColors[i]
                    )}>
                      <span className="text-xs font-black text-black">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold truncate", isMe ? "text-[#00D26A]" : "text-white")}>
                        {leader.user_name || leader.user_email || leader.referral_code}
                        {isMe && <span className="text-[9px] ml-2 text-[#00D26A]/60 font-black uppercase">(You)</span>}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Code: {leader.referral_code} · Earnings: ${leader.total_earnings.toFixed(0)}
                      </p>
                    </div>
                    {i === 0 && (
                      <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                  </div>
                );
              })}
              {pyramidLeaders.length < 5 && (
                Array.from({ length: 5 - pyramidLeaders.length }).map((_, i) => {
                  const idx = pyramidLeaders.length + i;
                  const widths = ["w-full", "w-[90%]", "w-[80%]", "w-[70%]", "w-[60%]"];
                  return (
                    <div
                      key={`empty-${idx}`}
                      className={cn(
                        "flex items-center justify-center px-4 py-3 rounded-xl border border-dashed border-white/5",
                        widths[idx]
                      )}
                    >
                      <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
                        #{idx + 1} — Open Spot
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}
          <p className="text-[9px] text-neutral-600 text-center mt-3">
            FIFO rotation — when #1 completes their cycle, they move to #5 and everyone shifts up
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Referral Link */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Copy className="w-4 h-4 text-[#00D26A]" />
                Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg bg-white/[0.02] border border-white/5 font-mono text-sm text-neutral-300 truncate">
                  {referralLink}
                </div>
                <Button
                  onClick={copyLink}
                  className={cn(
                    "h-11 px-4 font-bold",
                    copied
                      ? "bg-[#00D26A] text-black"
                      : "bg-white/5 hover:bg-white/10 text-white"
                  )}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">
                Share this link. When someone signs up and subscribes, they
                become your referral.
              </p>
            </CardContent>
          </Card>

          {/* Referrals List */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Referrals ({referrals.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#00D26A] bg-[#00D26A]/10 px-2 py-0.5 rounded-full">
                    {activeReferrals.length} active
                  </span>
                  {pendingReferrals.length > 0 && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                      {pendingReferrals.length} pending
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 font-medium">
                    No referrals yet
                  </p>
                  <p className="text-xs text-neutral-600">
                    Share your link to start earning
                  </p>
                </div>
              ) : (
                <div>
                  {referrals.map((ref) => (
                    <ReferralRow key={ref.id} referral={ref} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Commission Tiers */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Commission Tiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {COMMISSION_TIERS.map((t) => (
                <TierCard
                  key={t.percent}
                  tier={t}
                  isActive={tier.percent === t.percent}
                />
              ))}

              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] text-neutral-500 leading-relaxed">
                  Your commission rate is based on how many{" "}
                  <span className="text-white font-bold">
                    active (paying)
                  </span>{" "}
                  referrals you currently have. If a referral cancels, your
                  active count drops and your rate may decrease.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Example Calculator */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Earnings Example
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">
                    5 active on Starter ($89)
                  </span>
                  <span className="font-bold text-white">
                    5 x $89 x 20% = $89/mo
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">
                    5 active on Growth ($189)
                  </span>
                  <span className="font-bold text-white">
                    5 x $189 x 20% = $189/mo
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">
                    10 active on Agency ($389)
                  </span>
                  <span className="font-bold text-[#00D26A]">
                    10 x $389 x 30% = $1,167/mo
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-neutral-500">
                  Commissions are recurring — you earn every month as long as
                  your referrals stay active.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#00D26A]" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-[#00D26A]">
                    1
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Share your unique link with potential users
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-[#00D26A]">
                    2
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  They sign up and subscribe to a paid plan
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-[#00D26A]">
                    3
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  You earn a % of their subscription every month, forever
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-amber-400">
                    !
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  More active referrals = higher % for{" "}
                  <span className="text-white font-bold">all</span> your
                  referrals
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
