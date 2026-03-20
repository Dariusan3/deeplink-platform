"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAffiliate, AffiliateEntry } from "@/hooks/use-affiliate";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Copy,
  Check,
  DollarSign,
  Users,
  UserCheck,
  Wallet,
  Crown,
  ArrowDown,
  Clock,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Pyramid tier colors and labels
const TIER_CONFIG: Record<number, { color: string; glow: string; label: string; icon: React.ReactNode }> = {
  1: {
    color: "from-amber-400 to-yellow-500",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.3)]",
    label: "#1 — Gold",
    icon: <Crown className="w-5 h-5" />,
  },
  2: {
    color: "from-slate-300 to-slate-400",
    glow: "shadow-[0_0_20px_rgba(148,163,184,0.2)]",
    label: "#2 — Silver",
    icon: <Trophy className="w-4 h-4" />,
  },
  3: {
    color: "from-amber-600 to-amber-700",
    glow: "shadow-[0_0_20px_rgba(180,83,9,0.2)]",
    label: "#3 — Bronze",
    icon: <Trophy className="w-4 h-4" />,
  },
  4: {
    color: "from-[#00D26A] to-emerald-500",
    glow: "shadow-[0_0_15px_rgba(0,210,106,0.15)]",
    label: "#4",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
  5: {
    color: "from-[#00D26A]/70 to-emerald-600",
    glow: "",
    label: "#5",
    icon: <Sparkles className="w-3.5 h-3.5" />,
  },
};

function PyramidSlot({ entry, position, isMe }: { entry?: AffiliateEntry; position: number; isMe: boolean }) {
  const tier = TIER_CONFIG[position];
  const name = entry?.user?.full_name || entry?.user?.email?.split("@")[0] || "Empty";
  const initials = name.charAt(0).toUpperCase();

  // Pyramid width per tier
  const widths: Record<number, string> = { 1: "w-40", 2: "w-52", 3: "w-64", 4: "w-[19rem]", 5: "w-[22rem]" };

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "relative rounded-2xl border p-3 transition-all duration-500",
          widths[position] || "w-full",
          entry
            ? `bg-gradient-to-r ${tier.color} ${tier.glow} border-white/20`
            : "border-dashed border-white/10 bg-white/[0.02]",
          isMe && "ring-2 ring-[#39FF14] ring-offset-2 ring-offset-black"
        )}
      >
        {entry ? (
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 rounded-xl border-2 border-white/30">
              <AvatarFallback className="bg-black/20 text-white text-xs font-black rounded-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white truncate">{name}</p>
              <div className="flex items-center gap-1 text-white/70">
                {tier.icon}
                <span className="text-[9px] font-bold uppercase tracking-widest">{tier.label}</span>
              </div>
            </div>
            {isMe && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-black/20 text-[#39FF14] px-2 py-0.5 rounded-full">
                You
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-1">
            <Clock className="w-3.5 h-3.5 text-neutral-600" />
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              Position {position} — Open
            </span>
          </div>
        )}
      </div>
      {position < 5 && (
        <ArrowDown className="w-3.5 h-3.5 text-neutral-700 my-1" />
      )}
    </div>
  );
}

export default function AffiliatePage() {
  const {
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
  } = useAffiliate();

  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await joinProgram();
    } catch {}
    setJoining(false);
  };

  // Build pyramid slots (always show 5)
  const pyramidSlots = Array.from({ length: PYRAMID_SIZE }, (_, i) => {
    const pos = i + 1;
    const entry = pyramidMembers.find((e) => e.position === pos);
    return { position: pos, entry };
  });

  return (
    <>
      <Header title="Affiliate Program" />
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Affiliate Pyramid
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Earn {COMMISSION_PERCENT}% Recurring Commissions — Top {PYRAMID_SIZE} Earn
            </p>
          </div>
          {!myEntry && (
            <Button
              onClick={handleJoin}
              disabled={joining || loading}
              className="btn-primary-pulse h-12 px-8 rounded-xl text-black font-black uppercase tracking-widest text-xs"
            >
              {joining ? "Joining..." : "Join Program"}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Commission info */}
            <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-white mb-2">
                      Earn <span className="text-amber-400">{COMMISSION_PERCENT}%</span> recurring commissions
                    </h3>
                    <ul className="space-y-1.5 text-sm text-neutral-400">
                      <li className="flex items-start gap-2">
                        <span className="text-[#00D26A] mt-0.5">•</span>
                        Top {PYRAMID_SIZE} positions earn commissions on every qualified sale
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00D26A] mt-0.5">•</span>
                        First come, first served — FIFO queue system
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00D26A] mt-0.5">•</span>
                        If you leave, the next person in the waitlist gets promoted
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00D26A] mt-0.5">•</span>
                        You can rejoin — you go to the back of the line
                      </li>
                    </ul>
                  </div>
                  {myEntry && (
                    <div className={cn(
                      "text-center px-6 py-4 rounded-2xl border",
                      isInPyramid
                        ? "bg-[#00D26A]/5 border-[#00D26A]/20"
                        : "bg-amber-500/5 border-amber-500/20"
                    )}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">
                        Your Status
                      </p>
                      {isInPyramid ? (
                        <>
                          <p className="text-4xl font-black text-[#00D26A]">#{myPosition}</p>
                          <p className="text-[10px] font-bold text-[#00D26A] uppercase tracking-widest">
                            In Pyramid
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-4xl font-black text-amber-400">#{waitlistPosition}</p>
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                            In Waitlist
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Referral link */}
            {myEntry && referralLink && (
              <Card className="glass-card bg-white/[0.01] border-white/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                      Your Referral Link
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-mono truncate">
                      {referralLink}
                    </div>
                    <Button
                      onClick={handleCopy}
                      className={cn(
                        "px-5 rounded-xl font-black uppercase text-[10px] tracking-widest shrink-0 transition-all",
                        copied
                          ? "bg-[#00D26A] text-black"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            {myEntry && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Unpaid Earnings", value: `$${stats.earnings.toFixed(2)}`, icon: <DollarSign className="w-5 h-5" />, color: "text-[#00D26A]" },
                  { label: "Referred Users", value: stats.referralCount, icon: <Users className="w-5 h-5" />, color: "text-blue-400" },
                  { label: "Converted", value: stats.converted, icon: <UserCheck className="w-5 h-5" />, color: "text-amber-400" },
                  { label: "Pending", value: stats.pending, icon: <Wallet className="w-5 h-5" />, color: "text-purple-400" },
                ].map((stat) => (
                  <Card key={stat.label} className="glass-card bg-white/[0.01] border-white/5">
                    <CardContent className="p-5">
                      <div className={cn("p-2 rounded-xl w-fit mb-3", `${stat.color} bg-current/10`)}>
                        <div className={stat.color}>{stat.icon}</div>
                      </div>
                      <p className="text-2xl font-black text-white">{stat.value}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mt-1">
                        {stat.label}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* ═══ THE PYRAMID ═══ */}
            <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
              <CardHeader className="pt-8 px-8 pb-4">
                <CardTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Pyramid — Top {PYRAMID_SIZE}
                </CardTitle>
                <p className="text-xs text-neutral-500 font-medium">
                  Active positions earning {COMMISSION_PERCENT}% commissions
                </p>
              </CardHeader>
              <CardContent className="px-8 pb-8">
                <div className="flex flex-col items-center gap-0 py-6">
                  {pyramidSlots.map(({ position, entry }) => (
                    <PyramidSlot
                      key={position}
                      position={position}
                      entry={entry}
                      isMe={!!myEntry && entry?.id === myEntry.id}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Waitlist */}
            {waitlist.length > 0 && (
              <Card className="glass-card bg-white/[0.01] border-white/5">
                <CardHeader className="pt-6 px-6 pb-3">
                  <CardTitle className="text-sm font-black tracking-tight text-white flex items-center gap-2 uppercase">
                    <Clock className="w-4 h-4 text-neutral-500" />
                    Waitlist ({waitlist.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="space-y-2">
                    {waitlist.map((entry, i) => {
                      const name = entry.user?.full_name || entry.user?.email?.split("@")[0] || "User";
                      const isMe = !!myEntry && entry.id === myEntry.id;
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border transition-all",
                            isMe
                              ? "border-[#39FF14]/30 bg-[#39FF14]/5"
                              : "border-white/5 bg-white/[0.01]"
                          )}
                        >
                          <span className="text-xs font-black text-neutral-600 w-6 text-center">
                            #{i + 1}
                          </span>
                          <Avatar className="w-7 h-7 rounded-lg border border-white/10">
                            <AvatarFallback className="bg-white/5 text-white text-[10px] font-black rounded-lg">
                              {name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-white truncate">{name}</span>
                          {isMe && (
                            <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-[#39FF14]">
                              You
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commission History */}
            {myEntry && (
              <Card className="glass-card bg-white/[0.01] border-white/5">
                <CardHeader className="pt-6 px-6 pb-3">
                  <CardTitle className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-2">
                    Commission History
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {referrals.length === 0 ? (
                    <div className="text-center py-12">
                      <DollarSign className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                      <p className="text-sm font-bold text-neutral-400">No earnings yet</p>
                      <p className="text-xs text-neutral-600 mt-1">
                        Share your referral link to start earning
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-500 py-3 px-2">
                              Email
                            </th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-500 py-3 px-2">
                              Commission
                            </th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-500 py-3 px-2">
                              Date
                            </th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-500 py-3 px-2">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {referrals.map((ref) => (
                            <tr key={ref.id} className="border-b border-white/5">
                              <td className="py-3 px-2 text-xs text-white font-medium">
                                {ref.referred_email || "—"}
                              </td>
                              <td className="py-3 px-2 text-xs text-[#00D26A] font-bold">
                                ${ref.commission_amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-xs text-neutral-500">
                                {new Date(ref.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-2">
                                <span
                                  className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                                    ref.status === "paid"
                                      ? "bg-[#00D26A]/10 text-[#00D26A]"
                                      : ref.status === "converted"
                                      ? "bg-amber-500/10 text-amber-400"
                                      : "bg-white/5 text-neutral-500"
                                  )}
                                >
                                  {ref.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Leave button */}
            {myEntry && (
              <div className="flex justify-center pb-8">
                <Button
                  variant="ghost"
                  onClick={leaveProgram}
                  className="text-red-400 hover:text-red-500 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Leave Affiliate Program
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
