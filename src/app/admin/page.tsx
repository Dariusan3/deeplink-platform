"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  CreditCard,
  Link2,
  MousePointerClick,
  TrendingUp,
  Crown,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalLinks: number;
  totalClicks: number;
  activeSubs: number;
  freeSubs: number;
  planBreakdown: { plan: string; count: number }[];
  recentUsers: { email: string; full_name: string | null; created_at: string }[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: totalUsers },
        { count: totalTeams },
        { count: totalLinks },
        { count: totalClicks },
        { data: subs },
        { data: recentUsers },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("teams").select("*", { count: "exact", head: true }),
        supabase.from("links").select("*", { count: "exact", head: true }),
        supabase.from("link_clicks").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status, is_free").eq("status", "active"),
        supabase.from("users").select("email, full_name, created_at").order("created_at", { ascending: false }).limit(10),
      ]);

      const activeSubs = subs?.length ?? 0;
      const freeSubs = subs?.filter((s) => s.is_free).length ?? 0;

      const planCounts: Record<string, number> = {};
      for (const s of subs || []) {
        planCounts[s.plan] = (planCounts[s.plan] || 0) + 1;
      }
      const planBreakdown = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }));

      setStats({
        totalUsers: totalUsers ?? 0,
        totalTeams: totalTeams ?? 0,
        totalLinks: totalLinks ?? 0,
        totalClicks: totalClicks ?? 0,
        activeSubs,
        freeSubs,
        planBreakdown,
        recentUsers: recentUsers || [],
      });
      setLoading(false);
    }
    fetchStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-black text-white mb-8">Admin Overview</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats!.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Total Teams", value: stats!.totalTeams, icon: Crown, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
    { label: "Total Links", value: stats!.totalLinks, icon: Link2, color: "text-[#00D26A]", bg: "bg-[#00D26A]/10 border-[#00D26A]/20" },
    { label: "Total Clicks", value: stats!.totalClicks, icon: MousePointerClick, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Active Subscriptions", value: stats!.activeSubs, icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Free (Gifted)", value: stats!.freeSubs, icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white">Admin Overview</h1>
        <p className="text-sm text-neutral-500 mt-1">CRM dashboard — platform statistics at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="glass-card border-white/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl border ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{stat.value.toLocaleString()}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Breakdown */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-5">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00D26A]" />
              Plan Breakdown
            </h3>
            {stats!.planBreakdown.length === 0 ? (
              <p className="text-sm text-neutral-500">No active subscriptions yet</p>
            ) : (
              <div className="space-y-3">
                {stats!.planBreakdown.map((p) => {
                  const colors: Record<string, string> = {
                    starter: "bg-blue-500",
                    growth: "bg-purple-500",
                    agency: "bg-amber-500",
                    free: "bg-neutral-500",
                  };
                  const pct = stats!.activeSubs > 0 ? (p.count / stats!.activeSubs) * 100 : 0;
                  return (
                    <div key={p.plan}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-white capitalize">{p.plan}</span>
                        <span className="text-neutral-400">{p.count} teams ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[p.plan] || "bg-[#00D26A]"}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-5">
            <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Recent Signups
            </h3>
            <div className="space-y-2">
              {stats!.recentUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-neutral-400">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user.full_name || "No name"}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-600 shrink-0">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
