"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";
import { PLAN_LABEL, PLAN_PRICE_EUR } from "@/lib/plans";

// Earnings calculator for partners. Three sections — one per paid plan —
// where you set how many people you refer. It shows the commission those
// referrals earn, nothing more: no growth modelling, no projection.
// Purple to match the partner section.

// Prices come from PLAN_PRICE_EUR so the calculator can never drift from what
// the customer is actually charged on /pricing.
const PLANS: { key: string; name: string; price: number; popular?: boolean }[] = [
  { key: "starter", name: PLAN_LABEL.starter, price: PLAN_PRICE_EUR.starter },
  { key: "growth", name: PLAN_LABEL.growth, price: PLAN_PRICE_EUR.growth, popular: true },
  { key: "agency", name: PLAN_LABEL.agency, price: PLAN_PRICE_EUR.agency },
];

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-[#A855F7]/40 hover:text-[#A855F7] flex items-center justify-center transition-all"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-14 h-8 text-center bg-white/[0.03] border border-white/10 rounded-lg text-white font-black text-sm focus:outline-none focus:border-[#A855F7]/50"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300 hover:border-[#A855F7]/40 hover:text-[#A855F7] flex items-center justify-center transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function PartnerCalculator() {
  const [counts, setCounts] = useState<Record<string, number>>({
    starter: 5,
    growth: 2,
    agency: 0,
  });

  const setCount = (key: string, v: number) =>
    setCounts((c) => ({ ...c, [key]: v }));

  const total = useMemo(
    () =>
      PLANS.reduce(
        (sum, p) => sum + counts[p.key] * p.price * PARTNER_COMMISSION_RATE,
        0
      ),
    [counts]
  );

  const referrals = counts.starter + counts.growth + counts.agency;

  const fmt = (n: number) => "€" + Math.round(n).toLocaleString();

  return (
    <Card className="glass-card border-[#A855F7]/20 bg-[#A855F7]/[0.03]">
      <CardContent className="p-5 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#A855F7]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Earnings Calculator</h3>
            <p className="text-[11px] text-neutral-500">
              See what you&apos;d make at {Math.round(PARTNER_COMMISSION_RATE * 100)}% commission.
            </p>
          </div>
        </div>

        {/* 3 plan sections — how many referrals on each */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={cn(
                "rounded-xl border p-4",
                p.popular ? "border-[#A855F7]/30 bg-[#A855F7]/[0.05]" : "border-white/5 bg-white/[0.02]"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-widest text-white">{p.name}</span>
                <span className="text-[10px] font-bold text-neutral-500">€{p.price}/mo</span>
              </div>
              <Stepper value={counts[p.key]} onChange={(v) => setCount(p.key, v)} />
              <p className="text-[10px] text-neutral-600 mt-2">referrals</p>
              <p className="text-xs font-black text-[#A855F7] mt-1">
                {fmt(counts[p.key] * p.price * PARTNER_COMMISSION_RATE)}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#A855F7] mb-1">
            Your commission · {referrals} referral{referrals === 1 ? "" : "s"}
          </p>
          <p className="text-2xl font-black text-white">{fmt(total)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
