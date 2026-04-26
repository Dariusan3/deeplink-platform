"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePartnerStats } from "@/hooks/use-partner-stats";
import { TrendingUp, MousePointerClick, UserPlus, CheckCircle2 } from "lucide-react";

export default function PartnerStatsPage() {
  const { stats, loading } = usePartnerStats();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto pb-20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Stats</h1>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.02] rounded animate-pulse" />)}
        </div>
      ) : !stats || stats.totalClicks === 0 ? (
        <Card className="glass-card border-white/5">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-500">No traffic yet</p>
            <p className="text-xs text-neutral-600">Share your referral link to see stats</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Funnel */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00D26A]" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <FunnelStep icon={<MousePointerClick className="w-4 h-4" />} label="Clicks" value={stats.totalClicks} max={stats.totalClicks} color="bg-blue-500/30" />
                <FunnelStep icon={<UserPlus className="w-4 h-4" />} label="Signups" value={stats.totalSignups} max={stats.totalClicks} color="bg-amber-500/30" />
                <FunnelStep icon={<CheckCircle2 className="w-4 h-4" />} label="Conversions" value={stats.totalConversions} max={stats.totalClicks} color="bg-[#00D26A]/30" />
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Click → Conversion Rate</p>
                <p className="text-4xl font-black text-[#00D26A] mt-1">{(stats.conversionRate * 100).toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Geo + device */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black">Top Countries</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.countries.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6">No data</p>
                ) : (
                  <div className="space-y-2">
                    {stats.countries.slice(0, 10).map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-neutral-600 w-5">#{i + 1}</span>
                        <span className="flex-1 text-xs font-bold text-white truncate">{c.country || "Unknown"}</span>
                        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00D26A]" style={{ width: `${(c.count / stats.countries[0].count) * 100}%` }} />
                        </div>
                        <span className="text-xs text-neutral-400 w-10 text-right">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black">Device Split</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.devices.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6">No data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.devices.map((d, i) => {
                      const total = stats.devices.reduce((s, x) => s + x.count, 0);
                      const pct = total > 0 ? (d.count / total) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-bold text-white capitalize">{d.device}</span>
                            <span className="text-xs text-neutral-400">{pct.toFixed(0)}% ({d.count})</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#00D26A]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelStep({ icon, label, value, max, color }: { icon: React.ReactNode; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-neutral-400">{icon}</span>
          <span className="text-xs font-bold text-white">{label}</span>
        </div>
        <span className="text-sm font-black text-white">{value.toLocaleString()}</span>
      </div>
      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
