"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePartnerLeaderboard } from "@/hooks/use-partner-stats";
import { Trophy, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PartnerLeaderboardPage() {
  const { entries, myRank, loading } = usePartnerLeaderboard();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto pb-20">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-1">Partner Dashboard</p>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Leaderboard</h1>
      </div>

      {myRank !== null && myRank > 10 && (
        <Card className="glass-card border-[#00D26A]/30 bg-[#00D26A]/5">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-sm font-bold text-white">Your rank: #{myRank}</p>
            <p className="text-[10px] text-neutral-500">Keep going — top 10 awaits</p>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Top 10 — All-Time Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-white/[0.02] rounded animate-pulse" />)}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No partners yet</p>
          ) : (
            <div className="space-y-2">
              {entries.map((e) => (
                <div
                  key={e.partner_id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    e.is_me
                      ? "bg-[#00D26A]/5 border-[#00D26A]/30 shadow-[0_0_20px_rgba(0,210,106,0.1)]"
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0",
                    e.rank === 1 && "bg-gradient-to-br from-amber-400 to-yellow-500 text-black",
                    e.rank === 2 && "bg-gradient-to-br from-slate-300 to-slate-400 text-black",
                    e.rank === 3 && "bg-gradient-to-br from-amber-700 to-amber-800 text-white",
                    e.rank > 3 && "bg-white/5 text-neutral-400"
                  )}>
                    {e.rank === 1 ? <Crown className="w-4 h-4" /> : `#${e.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold truncate", e.is_me ? "text-[#00D26A]" : "text-white")}>
                      {e.is_me ? "You" : `Partner #${e.rank}`}
                    </p>
                  </div>
                  <p className="text-sm font-black text-white">${e.amount.toFixed(0)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-neutral-600 text-center">
        Names anonymized. Updated in real-time as commissions are paid out.
      </p>
    </div>
  );
}
