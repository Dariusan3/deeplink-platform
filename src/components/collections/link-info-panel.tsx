"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink, Link2, MousePointerClick, Globe, Smartphone,
  Calendar, TrendingUp, TrendingDown, X, Pause, CircleCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mac Finder-style info/preview panel for a selected link. Mirrors the
// "Get Info" pane: header with name + destination, then key stats and a
// 14-day sparkline. Fetches /api/links/:id/analytics on selection.

interface LinkAnalytics {
  link: {
    id: string;
    slug: string;
    title: string | null;
    destination_url: string;
    is_active: boolean | null;
    created_at: string;
    click_goal: number | null;
    click_goal_period: string | null;
  };
  totalClicks: number;
  clicks14d: number;
  last7: number;
  prev7: number;
  daily: { date: string; count: number }[];
  topCountry: string | null;
  devices: { name: string; count: number }[];
  lastClickAt: string | null;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function LinkInfoPanel({
  linkId,
  onClose,
  onOpenFull,
}: {
  linkId: string | null;
  onClose: () => void;
  onOpenFull: (linkId: string) => void;
}) {
  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!linkId) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    setData(null);
    (async () => {
      try {
        const res = await fetch(`/api/links/${linkId}/analytics`);
        const json = await res.json();
        if (!cancelled && res.ok) setData(json as LinkAnalytics);
      } catch { /* swallow */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [linkId]);

  if (!linkId) {
    // Empty state — mirrors Finder's "No selection" preview column.
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
          <MousePointerClick className="w-6 h-6 text-neutral-600" />
        </div>
        <p className="text-sm font-bold text-neutral-400">Select a link</p>
        <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
          Click any link in the tree to preview its stats here.
        </p>
      </div>
    );
  }

  const trend = data ? data.last7 - data.prev7 : 0;
  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-[#00D26A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white truncate">
            {data?.link.title || data?.link.slug || (loading ? "Loading…" : "")}
          </p>
          <p className="text-[11px] text-neutral-500 font-medium truncate">
            /{data?.link.slug ?? ""}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-white/5 transition-all shrink-0"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-600">
          Couldn&apos;t load analytics.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Status + destination */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {data.link.is_active === false ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-400">
                  <Pause className="w-3 h-3" /> Paused
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#00D26A]">
                  <CircleCheck className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <a
              href={data.link.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-neutral-400 hover:text-[#00D26A] transition-colors group/dest"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{data.link.destination_url}</span>
              <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/dest:opacity-100" />
            </a>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Total clicks</p>
              <p className="text-2xl font-black text-white">{data.totalClicks.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Last 7 days</p>
              <div className="flex items-center gap-1.5">
                <p className="text-2xl font-black text-white">{data.last7.toLocaleString()}</p>
                {trend !== 0 && (
                  <span className={cn(
                    "inline-flex items-center text-[10px] font-bold",
                    trend > 0 ? "text-[#00D26A]" : "text-red-400"
                  )}>
                    {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(trend)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 14-day sparkline */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2">Last 14 days</p>
            <div className="flex items-end gap-[2px] h-16">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 rounded-sm bg-[#00D26A]/40 hover:bg-[#00D26A] transition-colors min-h-[2px]"
                  style={{ height: `${(d.count / maxDaily) * 100}%` }}
                  title={`${d.date}: ${d.count} click${d.count !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          </div>

          {/* Meta rows */}
          <div className="space-y-2.5 text-xs">
            {data.topCountry && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Top country
                </span>
                <span className="text-white font-bold">{data.topCountry}</span>
              </div>
            )}
            {data.devices.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 inline-flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" /> Top device
                </span>
                <span className="text-white font-bold capitalize">{data.devices[0].name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 inline-flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" /> Last click
              </span>
              <span className="text-white font-bold">{fmtRelative(data.lastClickAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Created
              </span>
              <span className="text-white font-bold">{fmtDate(data.link.created_at)}</span>
            </div>
            {data.link.click_goal && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Goal
                </span>
                <span className="text-white font-bold">
                  {data.link.click_goal}/{data.link.click_goal_period ?? "day"}
                </span>
              </div>
            )}
          </div>

          {/* Open full link page */}
          <button
            onClick={() => onOpenFull(data.link.id)}
            className="w-full h-10 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/30 text-[#00D26A] text-[10px] font-black uppercase tracking-widest hover:bg-[#00D26A]/15 transition-all inline-flex items-center justify-center gap-2"
          >
            Open link page <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
