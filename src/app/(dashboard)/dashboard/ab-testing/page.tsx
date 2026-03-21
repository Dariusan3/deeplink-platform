"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useABTests, ABTest } from "@/hooks/use-ab-tests";
import {
  FlaskConical,
  Plus,
  Trophy,
  BarChart3,
  Eye,
  MousePointerClick,
  DollarSign,
  TrendingUp,
  Pause,
  Play,
  Trash2,
  Copy,
  Check,
  Crown,
  Target,
  Calculator,
  ArrowRight,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ROI Calculator Component
function ROICalculator() {
  const [adSpend, setAdSpend] = useState("");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");
  const [revenuePerConversion, setRevenuePerConversion] = useState("");

  const results = useMemo(() => {
    const spend = parseFloat(adSpend) || 0;
    const clickCount = parseInt(clicks) || 0;
    const convCount = parseInt(conversions) || 0;
    const revPerConv = parseFloat(revenuePerConversion) || 0;

    const totalRevenue = convCount * revPerConv;
    const roi = spend > 0 ? ((totalRevenue - spend) / spend) * 100 : 0;
    const cpc = clickCount > 0 ? spend / clickCount : 0;
    const cpa = convCount > 0 ? spend / convCount : 0;
    const convRate = clickCount > 0 ? (convCount / clickCount) * 100 : 0;
    const profit = totalRevenue - spend;

    return { totalRevenue, roi, cpc, cpa, convRate, profit };
  }, [adSpend, clicks, conversions, revenuePerConversion]);

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-black flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Calculator className="w-4 h-4 text-emerald-400" />
          </div>
          ROI Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Ad Spend ($)</Label>
            <Input
              type="number"
              placeholder="1000"
              value={adSpend}
              onChange={(e) => setAdSpend(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total Clicks</Label>
            <Input
              type="number"
              placeholder="5000"
              value={clicks}
              onChange={(e) => setClicks(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Conversions</Label>
            <Input
              type="number"
              placeholder="150"
              value={conversions}
              onChange={(e) => setConversions(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Revenue / Conv ($)</Label>
            <Input
              type="number"
              placeholder="50"
              value={revenuePerConversion}
              onChange={(e) => setRevenuePerConversion(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5 text-sm"
            />
          </div>
        </div>

        {(parseFloat(adSpend) > 0 || parseInt(clicks) > 0) && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className={cn("text-lg font-black", results.roi >= 0 ? "text-[#00D26A]" : "text-red-400")}>
                {results.roi.toFixed(1)}%
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">ROI</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className={cn("text-lg font-black", results.profit >= 0 ? "text-[#00D26A]" : "text-red-400")}>
                ${results.profit.toFixed(0)}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Profit</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-black text-white">{results.convRate.toFixed(1)}%</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Conv Rate</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-black text-white">${results.cpc.toFixed(2)}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">CPC</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-black text-white">${results.cpa.toFixed(2)}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">CPA</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/[0.02]">
              <p className="text-lg font-black text-[#00D26A]">${results.totalRevenue.toFixed(0)}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Revenue</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Create Test Dialog
function CreateTestDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [variantAUrl, setVariantAUrl] = useState("");
  const [variantBUrl, setVariantBUrl] = useState("");
  const [variantAName, setVariantAName] = useState("Variant A");
  const [variantBName, setVariantBName] = useState("Variant B");
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [minConversions, setMinConversions] = useState("100");
  const [thresholdPercent, setThresholdPercent] = useState("20");
  const [costPerClick, setCostPerClick] = useState("0");

  const handleCreate = () => {
    if (!name || !slug || !variantAUrl || !variantBUrl) {
      toast.error("Fill in all required fields");
      return;
    }
    onCreate({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      variant_a_url: variantAUrl,
      variant_b_url: variantBUrl,
      variant_a_name: variantAName,
      variant_b_name: variantBName,
      auto_optimize: autoOptimize,
      min_conversions: parseInt(minConversions) || 100,
      threshold_percent: parseInt(thresholdPercent) || 20,
      cost_per_click: parseFloat(costPerClick) || 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card border-white/5 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black">Create A/B Test</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Test Name *</Label>
            <Input
              placeholder="Landing Page Test"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5"
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Slug * (tappr.me/slug)</Label>
            <Input
              placeholder="landing-page"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Variant A Name</Label>
              <Input
                placeholder="Variant A"
                value={variantAName}
                onChange={(e) => setVariantAName(e.target.value)}
                className="mt-1 h-9 bg-blue-500/5 border-blue-500/10"
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Variant B Name</Label>
              <Input
                placeholder="Variant B"
                value={variantBName}
                onChange={(e) => setVariantBName(e.target.value)}
                className="mt-1 h-9 bg-purple-500/5 border-purple-500/10"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Variant A URL *</Label>
            <Input
              placeholder="https://example.com/page-a"
              value={variantAUrl}
              onChange={(e) => setVariantAUrl(e.target.value)}
              className="mt-1 h-9 bg-blue-500/5 border-blue-500/10"
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Variant B URL *</Label>
            <Input
              placeholder="https://example.com/page-b"
              value={variantBUrl}
              onChange={(e) => setVariantBUrl(e.target.value)}
              className="mt-1 h-9 bg-purple-500/5 border-purple-500/10"
            />
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold">Auto-Optimization</p>
                <p className="text-xs text-neutral-500">Automatically pick the winner</p>
              </div>
              <button
                onClick={() => setAutoOptimize(!autoOptimize)}
                className={cn(
                  "w-10 h-5 rounded-full transition-all",
                  autoOptimize ? "bg-[#00D26A]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white transition-all mx-0.5",
                  autoOptimize ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>

            {autoOptimize && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Min Conversions</Label>
                  <Input
                    type="number"
                    value={minConversions}
                    onChange={(e) => setMinConversions(e.target.value)}
                    className="mt-1 h-9 bg-white/[0.02] border-white/5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Threshold (%)</Label>
                  <Input
                    type="number"
                    value={thresholdPercent}
                    onChange={(e) => setThresholdPercent(e.target.value)}
                    className="mt-1 h-9 bg-white/[0.02] border-white/5"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Cost Per Click ($) — for ROI tracking</Label>
            <Input
              type="number"
              placeholder="0.50"
              value={costPerClick}
              onChange={(e) => setCostPerClick(e.target.value)}
              className="mt-1 h-9 bg-white/[0.02] border-white/5"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="ghost" onClick={onClose} className="flex-1 h-10 font-bold">Cancel</Button>
          <Button onClick={handleCreate} className="flex-1 h-10 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black">
            <Zap className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>
      </div>
    </div>
  );
}

// Variant comparison bar
function VariantBar({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-bold text-neutral-400">{label}</span>
        <span className="font-black text-white">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// Test detail card
function TestCard({ test, onSelectWinner, onUpdate, onDelete }: {
  test: ABTest;
  onSelectWinner: (id: string, winner: "a" | "b") => void;
  onUpdate: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const rateA = test.variant_a_visits > 0 ? (test.variant_a_conversions / test.variant_a_visits) * 100 : 0;
  const rateB = test.variant_b_visits > 0 ? (test.variant_b_conversions / test.variant_b_visits) * 100 : 0;
  const totalVisits = test.variant_a_visits + test.variant_b_visits;
  const totalConversions = test.variant_a_conversions + test.variant_b_conversions;
  const totalRevenue = Number(test.variant_a_revenue) + Number(test.variant_b_revenue);
  const totalCost = totalVisits * Number(test.cost_per_click);
  const profit = totalRevenue - totalCost;
  const roi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
  const maxVisits = Math.max(test.variant_a_visits, test.variant_b_visits);
  const maxConversions = Math.max(test.variant_a_conversions, test.variant_b_conversions);
  const leading = rateA > rateB ? "a" : rateB > rateA ? "b" : null;

  const testUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/` + test.slug;

  const copyUrl = () => {
    navigator.clipboard.writeText(testUrl);
    setCopied(true);
    toast.success("URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base font-black truncate">{test.name}</CardTitle>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                test.status === "running" ? "text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20" :
                test.status === "completed" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
                test.status === "paused" ? "text-neutral-400 bg-white/5 border-white/10" :
                "text-neutral-500 bg-white/5 border-white/10"
              )}>
                {test.status}
              </span>
              {test.winner && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Winner: {test.winner === "a" ? test.variant_a_name : test.variant_b_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-neutral-500 font-mono">{testUrl}</code>
              <button onClick={copyUrl} className="text-neutral-500 hover:text-white transition-colors">
                {copied ? <Check className="w-3 h-3 text-[#00D26A]" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {test.status === "running" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdate(test.id, { status: "paused" })}
              >
                <Pause className="w-3.5 h-3.5" />
              </Button>
            ) : test.status === "paused" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onUpdate(test.id, { status: "running" })}
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-500"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-lg font-black text-white">{totalVisits.toLocaleString()}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Visits</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-lg font-black text-white">{totalConversions.toLocaleString()}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Conversions</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-lg font-black text-[#00D26A]">${totalRevenue.toFixed(0)}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Revenue</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <p className={cn("text-lg font-black", roi >= 0 ? "text-[#00D26A]" : "text-red-400")}>
              {roi.toFixed(0)}%
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">ROI</p>
          </div>
        </div>

        {/* Variant Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Variant A */}
          <div className={cn(
            "p-3 rounded-xl border transition-all",
            leading === "a" ? "bg-blue-500/5 border-blue-500/20" : "bg-white/[0.01] border-white/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-blue-400">{test.variant_a_name}</span>
              {leading === "a" && <TrendingUp className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <div className="space-y-2">
              <VariantBar label="Visits" value={test.variant_a_visits} maxValue={maxVisits} color="bg-blue-500" />
              <VariantBar label="Conversions" value={test.variant_a_conversions} maxValue={maxConversions} color="bg-blue-400" />
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] font-bold text-neutral-500">Conv. Rate</span>
                <span className="text-sm font-black text-blue-400">{rateA.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-neutral-500">Revenue</span>
                <span className="text-sm font-black text-white">${Number(test.variant_a_revenue).toFixed(0)}</span>
              </div>
            </div>
            {!test.winner && test.status === "running" && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-2 h-7 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10"
                onClick={() => onSelectWinner(test.id, "a")}
              >
                <Crown className="w-3 h-3 mr-1" /> Select Winner
              </Button>
            )}
          </div>

          {/* Variant B */}
          <div className={cn(
            "p-3 rounded-xl border transition-all",
            leading === "b" ? "bg-purple-500/5 border-purple-500/20" : "bg-white/[0.01] border-white/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-purple-400">{test.variant_b_name}</span>
              {leading === "b" && <TrendingUp className="w-3.5 h-3.5 text-purple-400" />}
            </div>
            <div className="space-y-2">
              <VariantBar label="Visits" value={test.variant_b_visits} maxValue={maxVisits} color="bg-purple-500" />
              <VariantBar label="Conversions" value={test.variant_b_conversions} maxValue={maxConversions} color="bg-purple-400" />
              <div className="flex justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] font-bold text-neutral-500">Conv. Rate</span>
                <span className="text-sm font-black text-purple-400">{rateB.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-neutral-500">Revenue</span>
                <span className="text-sm font-black text-white">${Number(test.variant_b_revenue).toFixed(0)}</span>
              </div>
            </div>
            {!test.winner && test.status === "running" && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full mt-2 h-7 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/10"
                onClick={() => onSelectWinner(test.id, "b")}
              >
                <Crown className="w-3 h-3 mr-1" /> Select Winner
              </Button>
            )}
          </div>
        </div>

        {/* Auto-optimize info */}
        {test.auto_optimize && !test.winner && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#00D26A]/5 border border-[#00D26A]/10">
            <Zap className="w-3.5 h-3.5 text-[#00D26A] shrink-0" />
            <p className="text-[10px] text-neutral-400">
              Auto-optimization: Winner selected after <span className="font-bold text-white">{test.min_conversions}</span> conversions
              if one variant leads by <span className="font-bold text-white">{Number(test.threshold_percent)}%+</span>
            </p>
          </div>
        )}

        {/* Conversion tracking snippet */}
        <details className="group">
          <summary className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors">
            Conversion Tracking Code
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-black/50 border border-white/5 overflow-x-auto">
            <pre className="text-[11px] text-neutral-400 font-mono whitespace-pre">
{`// Add to your conversion page (thank you page, etc.)
fetch("/api/v1/ab-tests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    slug: "${test.slug}",
    variant: "a", // or "b" — detect from URL params
    revenue: 49.99  // optional — revenue from this conversion
  })
});`}
            </pre>
          </div>
        </details>
      </CardContent>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card border-white/5 rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-black mb-2">Delete Test?</h3>
            <p className="text-sm text-neutral-400 mb-4">This will permanently delete &quot;{test.name}&quot; and all its data.</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setShowDelete(false)} className="flex-1 font-bold">Cancel</Button>
              <Button onClick={() => { onDelete(test.id); setShowDelete(false); }} className="flex-1 bg-red-500 hover:bg-red-600 font-bold text-white">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ABTestingPage() {
  const { tests, loading, createTest, updateTest, deleteTest, selectWinner } = useABTests();
  const [showCreate, setShowCreate] = useState(false);

  const activeTests = tests.filter((t) => t.status === "running" || t.status === "paused");
  const completedTests = tests.filter((t) => t.status === "completed");

  const totalVisits = tests.reduce((sum, t) => sum + t.variant_a_visits + t.variant_b_visits, 0);
  const totalConversions = tests.reduce((sum, t) => sum + t.variant_a_conversions + t.variant_b_conversions, 0);
  const totalRevenue = tests.reduce((sum, t) => sum + Number(t.variant_a_revenue) + Number(t.variant_b_revenue), 0);

  return (
    <div className="space-y-6 p-6">
      <Header title="A/B Testing" />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20">
              <FlaskConical className="w-5 h-5 text-[#00D26A]" />
            </div>
            <div>
              <p className="text-2xl font-black">{tests.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Tests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-black">{totalVisits.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total Visits</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <MousePointerClick className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-black">{totalConversions.toLocaleString()}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Conversions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-[#00D26A]">${totalRevenue.toFixed(0)}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Revenue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">
              Active Tests ({activeTests.length})
            </h2>
            <Button
              onClick={() => setShowCreate(true)}
              className="h-8 px-4 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Test
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : activeTests.length === 0 ? (
            <Card className="glass-card border-white/5">
              <CardContent className="p-12 text-center">
                <FlaskConical className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-neutral-400 mb-1">No active tests</p>
                <p className="text-xs text-neutral-600 mb-4">Create your first A/B test to start optimizing</p>
                <Button onClick={() => setShowCreate(true)} className="h-8 px-4 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create Test
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onSelectWinner={selectWinner}
                onUpdate={updateTest}
                onDelete={deleteTest}
              />
            ))
          )}

          {completedTests.length > 0 && (
            <>
              <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400 pt-4">
                Completed Tests ({completedTests.length})
              </h2>
              {completedTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  onSelectWinner={selectWinner}
                  onUpdate={updateTest}
                  onDelete={deleteTest}
                />
              ))}
            </>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <ROICalculator />

          {/* How it works */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00D26A]" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-blue-400">1</span>
                </div>
                <p className="text-xs text-neutral-400">Create a test with a shared slug and two destination URLs</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-purple-400">2</span>
                </div>
                <p className="text-xs text-neutral-400">Traffic is split 50/50 between variants with fair random distribution</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-[#00D26A]">3</span>
                </div>
                <p className="text-xs text-neutral-400">Track conversions with the API, auto-optimize picks the winner</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] font-black text-amber-400">4</span>
                </div>
                <p className="text-xs text-neutral-400">Once a winner is selected, 100% traffic routes to the best page</p>
              </div>
            </CardContent>
          </Card>

          {/* API Info */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Conversion API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 rounded-lg bg-black/50 border border-white/5 overflow-x-auto">
                <pre className="text-[10px] text-neutral-400 font-mono whitespace-pre">
{`POST /api/v1/ab-tests
{
  "slug": "your-test-slug",
  "variant": "a",
  "revenue": 49.99
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showCreate && (
        <CreateTestDialog
          onClose={() => setShowCreate(false)}
          onCreate={createTest}
        />
      )}
    </div>
  );
}
