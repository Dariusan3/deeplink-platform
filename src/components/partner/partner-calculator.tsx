"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Minus, Plus, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";

// Predictable earnings calculator for partners. Three sections — one per
// paid plan — where you set how many people you refer each month. It then
// projects recurring commission over 12 months, including an optional
// word-of-mouth growth rate ("each referral brings a friend"). Purple to
// match the partner section.

const PLANS: { key: string; name: string; price: number; popular?: boolean }[] = [
  { key: "starter", name: "Starter", price: 97 },
  { key: "growth", name: "Growth", price: 297, popular: true },
  { key: "agency", name: "Agency", price: 997 },
];

const PURPLE = "#A855F7";

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
  // Word-of-mouth: % of your referral volume that compounds each month
  // because happy customers bring friends. 0 = flat, 20 = aggressive.
  const [viral, setViral] = useState(10);

  const setCount = (key: string, v: number) =>
    setCounts((c) => ({ ...c, [key]: v }));

  // Commission from ONE month's batch of new referrals — recurring, so it
  // keeps paying every month after.
  const monthlyBatchCommission = useMemo(() => {
    return PLANS.reduce(
      (sum, p) => sum + counts[p.key] * p.price * PARTNER_COMMISSION_RATE,
      0
    );
  }, [counts]);

  // 12-month projection of recurring monthly commission. Each month you
  // add a new batch (growing by the viral rate), and prior batches keep
  // paying — so recurring MRR accumulates.
  const projection = useMemo(() => {
    const months: { month: number; recurring: number; newThisMonth: number }[] = [];
    let recurring = 0;
    let batch = monthlyBatchCommission;
    for (let m = 1; m <= 12; m++) {
      recurring += batch; // prior batches keep paying + this month's adds on
      months.push({ month: m, recurring, newThisMonth: batch });
      batch = batch * (1 + viral / 100); // word-of-mouth grows next batch
    }
    return months;
  }, [monthlyBatchCommission, viral]);

  const year1Recurring = projection[11]?.recurring ?? 0;
  const year1Total = projection.reduce((s, m) => s + m.recurring, 0);
  const maxBar = Math.max(1, ...projection.map((m) => m.recurring));

  const fmt = (n: number) =>
    "€" + Math.round(n).toLocaleString();

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
              See what you&apos;d make at {Math.round(PARTNER_COMMISSION_RATE * 100)}% recurring commission.
            </p>
          </div>
        </div>

        {/* 3 plan sections — referrals per month */}
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
              <p className="text-[10px] text-neutral-600 mt-2">referrals / month</p>
              <p className="text-xs font-black text-[#A855F7] mt-1">
                {fmt(counts[p.key] * p.price * PARTNER_COMMISSION_RATE)}/mo each batch
              </p>
            </div>
          ))}
        </div>

        {/* Viral / word-of-mouth */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-neutral-300">
              Word-of-mouth growth — each batch brings more next month
            </span>
            <span className="text-sm font-black text-[#A855F7]">+{viral}%/mo</span>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            value={viral}
            onChange={(e) => setViral(Number(e.target.value))}
            className="w-full accent-[#A855F7]"
          />
          <div className="flex justify-between text-[9px] text-neutral-600 mt-1">
            <span>Flat (0%)</span>
            <span>Viral (30%)</span>
          </div>
        </div>

        {/* Headline projection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#A855F7] mb-1">
              Month 12 · recurring
            </p>
            <p className="text-2xl font-black text-white">{fmt(year1Recurring)}<span className="text-sm text-neutral-500">/mo</span></p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">
              Total earned · year 1
            </p>
            <p className="text-2xl font-black text-white">{fmt(year1Total)}</p>
          </div>
        </div>

        {/* 12-month bars */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3 inline-flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-[#A855F7]" /> Recurring commission · next 12 months
          </p>
          <div className="flex items-end gap-1.5 h-32">
            {projection.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                <span className="text-[8px] font-bold text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {fmt(m.recurring)}
                </span>
                <div
                  className="w-full rounded-t bg-[#A855F7]/40 group-hover:bg-[#A855F7] transition-colors min-h-[2px]"
                  style={{ height: `${(m.recurring / maxBar) * 100}%` }}
                  title={`Month ${m.month}: ${fmt(m.recurring)}/mo`}
                />
                <span className="text-[8px] text-neutral-600 font-medium">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI-style prediction summary */}
        <div className="rounded-xl border border-[#A855F7]/20 bg-[#A855F7]/[0.04] p-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-[#A855F7] shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-300 leading-relaxed">
            At <span className="font-bold text-white">{counts.starter + counts.growth + counts.agency} referrals/month</span>
            {viral > 0 && <> growing <span className="font-bold text-[#A855F7]">{viral}%</span> via word-of-mouth</>},
            you reach <span className="font-bold text-[#A855F7]">{fmt(year1Recurring)}/month recurring</span> by month 12 —
            a projected <span className="font-bold text-white">{fmt(year1Total)}</span> in your first year. Every customer
            keeps paying you for as long as they stay subscribed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
