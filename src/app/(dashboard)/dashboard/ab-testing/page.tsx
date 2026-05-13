"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useABTests, ABTest } from "@/hooks/use-ab-tests";
import { useCollections } from "@/hooks/use-collections";
import { useLinks } from "@/hooks/use-links";
import { FolderOpen, Link2, Film, Layers, Languages, FileText } from "lucide-react";
import {
  FlaskConical,
  Plus,
  Trophy,
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
  ArrowRight,
  Zap,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDisplayOrigin } from "@/lib/url-normalize";

// Pre-built test templates — each fills in sensible defaults for a common
// use case so the user doesn't start from a blank dialog. Selecting one
// only seeds the form; the user can still tweak every field after.
const TEST_TEMPLATES = [
  {
    key: "landing",
    label: "Landing pages",
    description: "Two landing pages for the same offer",
    icon: Link2,
    defaultName: "Landing page test",
    variantA: "Page A",
    variantB: "Page B",
  },
  {
    key: "vsl",
    label: "VSL vs Text",
    description: "Video sales letter vs written sales page",
    icon: Film,
    defaultName: "VSL vs Text",
    variantA: "VSL",
    variantB: "Text sales",
  },
  {
    key: "price",
    label: "Price anchor",
    description: "Same final price, different anchor price shown",
    icon: Layers,
    defaultName: "Price anchor test",
    variantA: "High anchor",
    variantB: "Low anchor",
  },
  {
    key: "offer",
    label: "Different offers",
    description: "Your own product vs an affiliate / partner offer",
    icon: FileText,
    defaultName: "Offer split test",
    variantA: "Offer A",
    variantB: "Offer B",
  },
  {
    key: "lang",
    label: "Language / market",
    description: "Translated landing vs original",
    icon: Languages,
    defaultName: "Language test",
    variantA: "EN",
    variantB: "Local",
  },
] as const;

type TemplateKey = (typeof TEST_TEMPLATES)[number]["key"] | "custom";

// Create Test Dialog
function CreateTestDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  // Sourcing mode: pick destinations from an existing collection, or paste
  // raw URLs. Collection mode is friendlier for non-tech users — they pick
  // two links they already created from a dropdown.
  const [sourceMode, setSourceMode] = useState<"collection" | "url">("collection");
  const [template, setTemplate] = useState<TemplateKey>("landing");

  const [name, setName] = useState("Landing page test");
  const [slug, setSlug] = useState("");
  const [variantAUrl, setVariantAUrl] = useState("");
  const [variantBUrl, setVariantBUrl] = useState("");
  const [variantAName, setVariantAName] = useState("Page A");
  const [variantBName, setVariantBName] = useState("Page B");
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [minConversions, setMinConversions] = useState("100");
  const [thresholdPercent, setThresholdPercent] = useState("20");
  const [costPerClick, setCostPerClick] = useState("0");

  // Collection-based source — pick a collection, then pick 2 links inside.
  const { collections } = useCollections();
  const { links } = useLinks();
  const [collectionId, setCollectionId] = useState<string>("");
  const [linkAId, setLinkAId] = useState<string>("");
  const [linkBId, setLinkBId] = useState<string>("");

  const linksInCollection = useMemo(
    () => links.filter((l) => collectionId && l.collection_id === collectionId && l.is_active),
    [links, collectionId]
  );

  // Selecting a template seeds the form — but only fields the user hasn't
  // typed yet so we don't overwrite their work.
  const applyTemplate = (key: TemplateKey) => {
    setTemplate(key);
    const t = TEST_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setName(t.defaultName);
    setVariantAName(t.variantA);
    setVariantBName(t.variantB);
  };

  const handleCreate = () => {
    if (!name || !slug) {
      toast.error("Test name and slug are required");
      return;
    }

    let aUrl = variantAUrl;
    let bUrl = variantBUrl;
    let aName = variantAName;
    let bName = variantBName;

    if (sourceMode === "collection") {
      const linkA = links.find((l) => l.id === linkAId);
      const linkB = links.find((l) => l.id === linkBId);
      if (!linkA || !linkB) {
        toast.error("Pick a link for each variant");
        return;
      }
      if (linkA.id === linkB.id) {
        toast.error("Variant A and B must be different links");
        return;
      }
      aUrl = linkA.destination_url;
      bUrl = linkB.destination_url;
      aName = linkA.title || linkA.slug;
      bName = linkB.title || linkB.slug;
    } else {
      if (!aUrl || !bUrl) {
        toast.error("Both variant URLs are required");
        return;
      }
    }

    onCreate({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      variant_a_url: aUrl,
      variant_b_url: bUrl,
      variant_a_name: aName,
      variant_b_name: bName,
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

        <div className="space-y-5">
          {/* ── Template selector ──────────────────────────────── */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              What are you testing?
            </Label>
            <p className="text-[10px] text-neutral-600 mt-0.5 mb-2">Pick a template to seed sensible defaults — you can still tweak everything.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TEST_TEMPLATES.map((t) => {
                const Icon = t.icon;
                const selected = template === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => applyTemplate(t.key)}
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-xl border text-left transition-all",
                      selected
                        ? "border-[#00D26A]/40 bg-[#00D26A]/5 shadow-[0_0_15px_rgba(0,210,106,0.1)]"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      selected ? "bg-[#00D26A]/15 text-[#00D26A]" : "bg-white/5 text-neutral-400"
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-xs font-black leading-tight", selected ? "text-white" : "text-neutral-200")}>
                        {t.label}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-tight">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Name + slug ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          </div>

          {/* ── Source mode tabs ────────────────────────────────── */}
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
              Variants source
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setSourceMode("collection")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all",
                  sourceMode === "collection"
                    ? "border-[#00D26A]/40 bg-[#00D26A]/5 text-white"
                    : "border-white/5 bg-white/[0.02] text-neutral-400 hover:bg-white/5"
                )}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Pick from collection
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("url")}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all",
                  sourceMode === "url"
                    ? "border-[#00D26A]/40 bg-[#00D26A]/5 text-white"
                    : "border-white/5 bg-white/[0.02] text-neutral-400 hover:bg-white/5"
                )}
              >
                <Link2 className="w-3.5 h-3.5" />
                Paste URLs
              </button>
            </div>
          </div>

          {/* ── Collection picker ──────────────────────────────── */}
          {sourceMode === "collection" && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Collection *</Label>
                <select
                  value={collectionId}
                  onChange={(e) => { setCollectionId(e.target.value); setLinkAId(""); setLinkBId(""); }}
                  className="mt-1 w-full h-9 px-3 rounded-md bg-white/[0.02] border border-white/5 text-white text-sm focus:outline-none focus:border-[#00D26A]/30"
                >
                  <option value="" className="bg-neutral-900">
                    {collections.length === 0 ? "No collections yet — create one first" : "Select a collection…"}
                  </option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id} className="bg-neutral-900">{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Variant A — link *</Label>
                  <select
                    value={linkAId}
                    onChange={(e) => setLinkAId(e.target.value)}
                    disabled={!collectionId}
                    className="mt-1 w-full h-9 px-3 rounded-md bg-blue-500/5 border border-blue-500/10 text-white text-sm focus:outline-none focus:border-blue-500/30 disabled:opacity-50"
                  >
                    <option value="" className="bg-neutral-900">
                      {!collectionId
                        ? "Pick collection first"
                        : linksInCollection.length === 0
                          ? "No active links in this collection"
                          : "Choose link A…"}
                    </option>
                    {linksInCollection.map((l) => (
                      <option key={l.id} value={l.id} className="bg-neutral-900">
                        {l.title || l.slug}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Variant B — link *</Label>
                  <select
                    value={linkBId}
                    onChange={(e) => setLinkBId(e.target.value)}
                    disabled={!collectionId}
                    className="mt-1 w-full h-9 px-3 rounded-md bg-purple-500/5 border border-purple-500/10 text-white text-sm focus:outline-none focus:border-purple-500/30 disabled:opacity-50"
                  >
                    <option value="" className="bg-neutral-900">
                      {!collectionId
                        ? "Pick collection first"
                        : linksInCollection.length === 0
                          ? "No active links in this collection"
                          : "Choose link B…"}
                    </option>
                    {linksInCollection.map((l) => (
                      <option key={l.id} value={l.id} className="bg-neutral-900">
                        {l.title || l.slug}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-neutral-600 leading-relaxed">
                Variant names are taken from each link&apos;s title (or slug if no title). Each visitor gets a 50/50 split between the two destinations.
              </p>
            </div>
          )}

          {/* ── URL inputs (alternative source) ──────────────────── */}
          {sourceMode === "url" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Variant A name</Label>
                  <Input
                    placeholder="Variant A"
                    value={variantAName}
                    onChange={(e) => setVariantAName(e.target.value)}
                    className="mt-1 h-9 bg-blue-500/5 border-blue-500/10"
                  />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Variant B name</Label>
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
            </div>
          )}

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

  const testUrl = `${getDisplayOrigin()}/${test.slug}`;

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

      {/* Tests — full width now that the ROI sidebar is gone. */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">
            Active Tests ({activeTests.length})
          </h2>
          <Button
            onClick={() => setShowCreate(true)}
            className="h-9 px-4 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black text-xs"
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
              <Button onClick={() => setShowCreate(true)} className="h-9 px-4 bg-[#00D26A] hover:bg-[#00D26A]/90 text-black font-black text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                onSelectWinner={selectWinner}
                onUpdate={updateTest}
                onDelete={deleteTest}
              />
            ))}
          </div>
        )}

        {completedTests.length > 0 && (
          <div className="pt-4 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">
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
          </div>
        )}
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
