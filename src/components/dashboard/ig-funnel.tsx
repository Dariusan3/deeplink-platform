"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIgInsights } from "@/hooks/use-ig-insights";
import { useClickStats } from "@/hooks/use-click-stats";
import { cn } from "@/lib/utils";
import {
  Eye,
  MousePointerClick,
  ArrowDown,
  Instagram,
  Users,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export function IgFunnel() {
  const { profile, insights, loading, error, isConnected } = useIgInsights();
  const { totalClicks } = useClickStats();

  if (!isConnected) {
    return (
      <Card className="glass-card border-white/5">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-purple-500/20 flex items-center justify-center mb-3">
            <Instagram className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-sm font-bold text-neutral-400 mb-1">Instagram Funnel</p>
          <p className="text-xs text-neutral-600 mb-3">
            Connect your Instagram to see profile views alongside link clicks
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:underline"
          >
            Connect in Settings <ExternalLink className="w-3 h-3" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Instagram className="w-4 h-4 text-purple-400" />
            Instagram Funnel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-white/5">
        <CardContent className="p-6 text-center">
          <Instagram className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">{error}</p>
          {error.includes("expired") && (
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:underline"
            >
              Reconnect <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  const profileViews = insights?.profileViews ?? 0;
  const linkClicks = totalClicks;
  const clickThroughRate = profileViews > 0 ? ((linkClicks / profileViews) * 100) : 0;

  // Funnel steps: each step is relative to the previous
  const steps = [
    {
      label: "Profile Views",
      value: profileViews,
      icon: <Eye className="w-4 h-4" />,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/20",
      textColor: "text-purple-400",
      barColor: "bg-purple-500",
      pct: 100,
    },
    {
      label: "Link Clicks",
      value: linkClicks,
      icon: <MousePointerClick className="w-4 h-4" />,
      color: "from-[#00D26A]/20 to-[#39FF14]/10",
      borderColor: "border-[#00D26A]/20",
      textColor: "text-[#00D26A]",
      barColor: "bg-[#00D26A]",
      pct: profileViews > 0 ? Math.min((linkClicks / profileViews) * 100, 100) : 0,
    },
  ];

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <div className="p-1 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <Instagram className="w-3.5 h-3.5 text-purple-400" />
            </div>
            Instagram Funnel
          </CardTitle>
          {profile && (
            <span className="text-[10px] font-bold text-neutral-500">
              @{profile.username}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Profile stats row */}
        {profile && (
          <div className="flex items-center gap-3 pb-3 border-b border-white/5">
            {profile.followers !== null && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-neutral-500" />
                <span className="text-xs font-black text-white">{profile.followers.toLocaleString()}</span>
                <span className="text-[9px] text-neutral-500">followers</span>
              </div>
            )}
            {insights && insights.reach > 0 && (
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-neutral-500" />
                <span className="text-xs font-black text-white">{insights.reach.toLocaleString()}</span>
                <span className="text-[9px] text-neutral-500">reach</span>
              </div>
            )}
          </div>
        )}

        {/* Funnel visualization */}
        {steps.map((step, i) => (
          <div key={step.label}>
            {i > 0 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-3.5 h-3.5 text-neutral-600" />
              </div>
            )}
            <div className={cn(
              "relative rounded-xl border p-3 bg-gradient-to-r",
              step.color,
              step.borderColor
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={step.textColor}>{step.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    {step.label}
                  </span>
                </div>
                <span className={cn("text-lg font-black", step.textColor)}>
                  {step.value.toLocaleString()}
                </span>
              </div>
              {/* Funnel bar */}
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", step.barColor)}
                  style={{ width: `${Math.max(step.pct, 2)}%` }}
                />
              </div>
              {i > 0 && step.pct > 0 && (
                <p className="text-[9px] text-neutral-500 mt-1.5">
                  {step.pct.toFixed(1)}% of profile views
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Click-through rate summary */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Profile → Click Rate
            </span>
            <span className={cn(
              "text-sm font-black",
              clickThroughRate > 5 ? "text-[#00D26A]" : clickThroughRate > 1 ? "text-amber-400" : "text-red-400"
            )}>
              {clickThroughRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-[9px] text-neutral-600 mt-1">
            Last 30 days · {profileViews.toLocaleString()} profile views → {linkClicks.toLocaleString()} clicks
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
