"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePartner } from "@/hooks/use-partner";
import { Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "active" | "pending" | "churned";

const PLAN_COLORS: Record<string, string> = {
  agency: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  growth: "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30",
  starter: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

export default function PartnerReferralsPage() {
  const { referrals, monthlyMrr, profile, loading } = usePartner();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = referrals.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search.trim() && !r.referred_email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: referrals.length,
    active: referrals.filter((r) => r.status === "active").length,
    pending: referrals.filter((r) => r.status === "pending").length,
    churned: referrals.filter((r) => r.status === "churned").length,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Referrals</h1>
      </div>

      {/* MRR header */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">MRR Generated</p>
            <p className="text-3xl font-black text-[#00D26A]">${monthlyMrr.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Your Cut</p>
            <p className="text-xl font-black text-white">
              ${(monthlyMrr * (profile?.commission_rate ?? 0.25)).toFixed(2)}/mo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {(["all", "active", "pending", "churned"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
              filter === f
                ? "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30"
                : "bg-white/[0.02] text-neutral-500 border-white/10 hover:text-white"
            )}
          >
            {f} <span className="ml-1 opacity-60">({counts[f]})</span>
          </button>
        ))}
        <div className="relative flex-1 min-w-[200px] max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white/[0.02] border-white/10 text-xs"
          />
        </div>
      </div>

      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            All Referrals ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-500">
                {referrals.length === 0 ? "No referrals yet" : "No matches for this filter"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">Email</th>
                    <th className="text-left text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">Plan</th>
                    <th className="text-right text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">$/mo</th>
                    <th className="text-right text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">Your Cut</th>
                    <th className="text-left text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">Joined</th>
                    <th className="text-right text-[9px] font-black uppercase tracking-widest text-neutral-500 py-2.5 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="py-3 px-2 text-xs font-bold text-white truncate max-w-[200px]">{r.referred_email}</td>
                      <td className="py-3 px-2">
                        {r.plan ? (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
                            PLAN_COLORS[r.plan] || "bg-white/5 text-neutral-400 border-white/10"
                          )}>
                            {r.plan}
                          </span>
                        ) : <span className="text-[10px] text-neutral-600">—</span>}
                      </td>
                      <td className="py-3 px-2 text-xs text-right font-bold text-white">
                        {r.monthly_value > 0 ? `$${Number(r.monthly_value).toFixed(0)}` : "—"}
                      </td>
                      <td className="py-3 px-2 text-xs text-right font-black text-[#00D26A]">
                        {r.status === "active" && r.monthly_value > 0
                          ? `$${(Number(r.monthly_value) * (profile?.commission_rate ?? 0.25)).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-3 px-2 text-[10px] text-neutral-500">
                        {new Date(r.signed_up_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                          r.status === "active" && "bg-[#00D26A]/10 text-[#00D26A]",
                          r.status === "pending" && "bg-amber-500/10 text-amber-400",
                          r.status === "churned" && "bg-red-500/10 text-red-400"
                        )}>
                          {r.status}
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
    </div>
  );
}
