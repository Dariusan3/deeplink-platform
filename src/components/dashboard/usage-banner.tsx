"use client";

import { useUsage } from "@/hooks/use-usage";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function UsageBanner() {
  const { monthlyClicks, limit, percentage, daysUntilReset, loading } = useUsage();

  if (loading) return null;

  const getColor = () => {
    if (percentage >= 90) return { text: "text-red-400", bg: "bg-red-500", border: "border-red-500/20" };
    if (percentage >= 70) return { text: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/20" };
    return { text: "text-[#00D26A]", bg: "bg-[#00D26A]", border: "border-[#00D26A]/20" };
  };

  const colors = getColor();

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 bg-white/[0.02] border-b", colors.border)}>
      <Info className={cn("w-4 h-4 shrink-0", colors.text)} />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xs font-bold text-neutral-300">
          <span className={cn("font-black", colors.text)}>{monthlyClicks}</span>
          {" "}of{" "}
          <span className="font-black text-white">{limit}</span>
          {" "}free clicks used this month
          <span className="text-neutral-500"> (resets in {daysUntilReset} days).</span>
        </span>
        {/* Progress bar */}
        <div className="hidden sm:block w-24 h-1.5 rounded-full bg-white/5 overflow-hidden shrink-0">
          <div
            className={cn("h-full rounded-full transition-all", colors.bg)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-neutral-400 font-medium hidden md:block">
        Upgrade to unlock all features and avoid interruptions.
      </span>
      <Button
        render={<Link href="/pricing" />}
        nativeButton={false}
        variant="outline"
        size="sm"
        className="shrink-0 h-7 rounded-md border-[#00D26A]/30 bg-[#00D26A]/10 text-[#00D26A] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/20"
      >
        Upgrade Now
      </Button>
    </div>
  );
}
