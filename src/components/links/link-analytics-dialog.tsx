"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalLink, Link2, MousePointerClick, Globe, Smartphone,
  Calendar, TrendingUp, TrendingDown, Pause, CircleCheck, Share2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Full-screen per-link analytics dialog. Opens over the whole page when
// the user asks to see a single link's analytics — instead of routing to
// /dashboard/analytics (which is the all-links view). Reads the same
// /api/links/:id/analytics endpoint the tree info panel uses.

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
  countries: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
  lastClickAt: string | null;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

export function LinkAnalyticsDialog({
  linkId,
  open,
  onOpenChange,
}: {
  linkId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<LinkAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !linkId) { setData(null); return; }
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
  }, [open, linkId]);

  const trend = data ? data.last7 - data.prev7 : 0;
  const maxDaily = data ? Math.max(1, ...data.daily.map((d) => d.count)) : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-black/95 border-white/10 text-white w-[96vw] sm:max-w-none h-[92vh] max-h-[92vh] overflow-y-auto scrollbar-none p-0">
        {loading || !data ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
            <p className="text-xs text-neutral-500 mt-4 font-medium">Loading analytics…</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-white/5 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
                  <Link2 className="w-6 h-6 text-[#00D26A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-2xl font-black tracking-tight text-white truncate">
                    {data.link.title || data.link.slug}
                  </DialogTitle>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-neutral-500 font-medium">/{data.link.slug}</span>
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
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-[#00D26A] mt-2 transition-colors group/dest"
                  >
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-md">{data.link.destination_url}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover/dest:opacity-100" />
                  </a>
                </div>

                {/* Prominent close button — top-right of the header. */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-neutral-400 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  aria-label="Close analytics"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Total clicks" value={data.totalClicks.toLocaleString()} />
                <StatCard
                  label="Last 7 days"
                  value={data.last7.toLocaleString()}
                  trend={trend}
                />
                <StatCard label="Top country" value={data.topCountry ?? "—"} />
                <StatCard label="Last click" value={fmtRelative(data.lastClickAt)} />
              </div>

              {/* 14-day chart */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">
                  Clicks · last 14 days
                </p>
                <div className="flex items-end gap-2 h-72">
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group/bar">
                      <span className="text-[9px] font-bold text-neutral-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                        {d.count}
                      </span>
                      <div
                        className="w-full rounded-md bg-[#00D26A]/40 group-hover/bar:bg-[#00D26A] transition-colors min-h-[3px]"
                        style={{ height: `${(d.count / maxDaily) * 100}%` }}
                        title={`${d.date}: ${d.count} click${d.count !== 1 ? "s" : ""}`}
                      />
                      <span className="text-[8px] text-neutral-600 font-medium">
                        {d.date.slice(8)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BreakdownList
                  title="Countries"
                  icon={<Globe className="w-3.5 h-3.5" />}
                  items={data.countries}
                  total={data.clicks14d}
                />
                <BreakdownList
                  title="Devices"
                  icon={<Smartphone className="w-3.5 h-3.5" />}
                  items={data.devices}
                  total={data.clicks14d}
                  capitalize
                />
                <BreakdownList
                  title="Referrers"
                  icon={<Share2 className="w-3.5 h-3.5" />}
                  items={data.referrers}
                  total={data.clicks14d}
                />
              </div>

              {/* Meta footer */}
              <div className="flex items-center gap-6 flex-wrap text-xs text-neutral-500 pt-2 border-t border-white/5">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Created {fmtDate(data.link.created_at)}
                </span>
                {data.link.click_goal && (
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Goal {data.link.click_goal}/{data.link.click_goal_period ?? "day"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" /> {data.clicks14d} clicks in last 14 days
                </span>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-2xl font-black text-white truncate">{value}</p>
        {trend !== undefined && trend !== 0 && (
          <span className={cn(
            "inline-flex items-center text-[10px] font-bold shrink-0",
            trend > 0 ? "text-[#00D26A]" : "text-red-400"
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}
          </span>
        )}
      </div>
    </div>
  );
}

function BreakdownList({
  title, icon, items, total, capitalize,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; count: number }[];
  total: number;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 inline-flex items-center gap-1.5">
        {icon} {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-neutral-600">No data yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
            return (
              <div key={it.name}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className={cn("text-neutral-300 font-medium truncate", capitalize && "capitalize")}>
                    {it.name}
                  </span>
                  <span className="text-neutral-500 font-bold shrink-0 ml-2">{it.count}</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-[#00D26A]/50 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
