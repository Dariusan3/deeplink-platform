"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTeam } from "@/hooks/use-team";
import { createClient } from "@/lib/supabase/client";
import {
  ALERT_LABELS,
  ALERT_TIERS,
  TIER_META,
  hasClickCap,
  planClickCap,
  type AlertType,
  type AlertSeverity,
  type AlertTier,
} from "@/lib/alerts";
import { alertBadge, alertSubject, alertSummary, alertUrl } from "@/lib/alert-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { MetricsDashboard } from "@/components/alerts/metrics-dashboard";
import {
  ShieldCheck,
  ShieldAlert,
  Trash2,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  RefreshCw,
  X,
  Search,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { ALERT_ICONS as CATEGORY_ICONS } from "@/lib/alert-icons";

// Rows we render — anomaly_alerts row enriched with the typed alert_type
// fields the migration added.
type AlertRow = {
  id: string;
  team_id: string;
  alert_type: AlertType | null;
  severity: AlertSeverity;
  title: string;
  description: string;
  affected_link: string | null;
  dedup_key: string | null;
  acknowledged_at: string | null;
  re_verified_after_ack: boolean;
  is_dismissed: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// ── Layout note ──────────────────────────────────────────────────────
// This page is an inbox, not a dashboard. One alert = one row; everything
// secondary (the destination URL, the full advice, the CTAs) lives behind an
// expand. The previous version stacked a plan banner, a hero card, four tier
// tiles, a filter bar and a metrics panel above the list, then nested every
// alert under a tier heading AND a category badge — roughly 500px of chrome
// and three levels of hierarchy before you could read a single alert. Tier and
// category are now filters and a chip, which is all they ever were.

// The only three colours on the page. high = red, medium = amber, low = green.
// Everything that shows colour reads from here.
// `bar` is the left accent border that carries a row's urgency at a glance.
// low is deliberately NEUTRAL, not green: a green row reads as "good/resolved",
// and mixing it into a red/amber urgency scale is exactly what made the list
// hard to triage. The positive framing of low-tier items ("Opportunities") is
// carried by the section header instead, where green means what it should.
type Sev = "high" | "medium" | "low";
const SEVERITY_STYLES: Record<Sev, { dot: string; tint: string; text: string; border: string; bar: string }> = {
  high:   { dot: "bg-red-500",     tint: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/25",   bar: "border-l-red-500"    },
  medium: { dot: "bg-amber-400",   tint: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/25", bar: "border-l-amber-400"  },
  low:    { dot: "bg-neutral-500", tint: "bg-white/[0.05]",   text: "text-neutral-300", border: "border-white/15",     bar: "border-l-white/15"   },
};
function sevStyle(severity: string) {
  return SEVERITY_STYLES[(severity as Sev)] ?? SEVERITY_STYLES.medium;
}

const TIER_ORDER: AlertTier[] = [1, 2, 3, 4];
// Sort weight within a row's tier. Urgency used to be carried by which section
// an alert sat in; in a flat list it has to be carried by the sort.
const SEV_WEIGHT: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Age-out rule. Alerts older than this drop off the page UNLESS they're tier-1
// (Critical). A still-open critical — a broken destination, a hit plan cap — is
// "losing money right now" no matter when it first fired, so it never ages out.
// Everything else (opportunities, trends, housekeeping) is noise once it's a
// week old: an A/B winner or a goal you hit three weeks ago isn't a to-do.
// The schema has no per-alert "last re-confirmed" timestamp, so we gate on
// created_at + tier rather than on staleness of the underlying condition.
const STALE_AFTER_DAYS = 7;
function isStaleAlert(a: AlertRow): boolean {
  const tier = a.alert_type ? ALERT_TIERS[a.alert_type] ?? 4 : 4;
  if (tier === 1) return false; // criticals never age out
  const ageMs = Date.now() - new Date(a.created_at).getTime();
  return ageMs > STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

// Per-team alerts cache (stale-while-revalidate) so the list paints
// instantly on repeat visits instead of waiting on the query.
const ALERTS_CACHE_PREFIX = "tappr_alerts_cache_";
function readAlertsCache(teamId: string): AlertRow[] | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(ALERTS_CACHE_PREFIX + teamId) : null;
    return raw ? (JSON.parse(raw) as AlertRow[]) : null;
  } catch { return null; }
}
function writeAlertsCache(teamId: string, alerts: AlertRow[]) {
  try { localStorage.setItem(ALERTS_CACHE_PREFIX + teamId, JSON.stringify(alerts)); } catch {}
}

// Small segmented control used in the filter bar.
function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={cn(
            "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer",
            value === o.v ? "bg-white/10 text-white" : "text-neutral-500 hover:text-neutral-300"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AlertsPage() {
  const { activeTeam } = useTeam();
  const supabase = useMemo(() => createClient(), []);
  // Deterministic initial state so SSR + first client render match; the
  // cached snapshot is applied in an effect after mount.
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  // Bumped after a successful manual re-check — drives the metrics
  // dashboard to refetch so the visible numbers match the new alerts.
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);

  // ── Filters + view state ──────────────────────────────────────────
  const [tierFilter, setTierFilter] = useState<AlertTier | "all">("all");
  const [sevFilter, setSevFilter] = useState<Sev | "all">("all");
  const [search, setSearch] = useState("");
  const [metricsOpen, setMetricsOpen] = useState(false); // secondary info, collapsed by default
  const [expanded, setExpanded] = useState<string | null>(null); // one row open at a time

  const fetchAlerts = useCallback(async (showLoading = false) => {
    if (!activeTeam?.id) return;
    // Only show the skeleton on the initial load AND only when there's
    // nothing cached to display. Realtime-triggered refetches (ack,
    // dismiss, cron insert) pass `false` so they update the list in place
    // without flashing the skeleton.
    if (showLoading && !readAlertsCache(activeTeam.id)) setLoading(true);
    const { data, error } = await supabase
      .from("anomaly_alerts")
      .select("*")
      .eq("team_id", activeTeam.id)
      .eq("is_dismissed", false)
      .not("alert_type", "is", null)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) {
      // Drop aged-out non-critical alerts before they ever reach state, so the
      // list, the tier counts and the empty state all agree on what's "open".
      const rows = ((data || []) as AlertRow[]).filter((r) => !isStaleAlert(r));
      setAlerts(rows);
      writeAlertsCache(activeTeam.id, rows);
    }
    setLoading(false);
  }, [activeTeam?.id, supabase]);

  // Hydrate from cache post-mount, then revalidate.
  useEffect(() => {
    if (!activeTeam?.id) return;
    const cached = readAlertsCache(activeTeam.id);
    if (cached) { setAlerts(cached); setLoading(false); }
  }, [activeTeam?.id]);

  useEffect(() => { fetchAlerts(true); }, [fetchAlerts]);

  // Realtime: any anomaly_alerts change for this team triggers a refetch.
  // Pass `false` so we DON'T flash the skeleton — the list updates in
  // place without a visible reload.
  useEffect(() => {
    if (!activeTeam?.id) return;
    const channel = supabase
      .channel(`alerts-realtime-${activeTeam.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "anomaly_alerts", filter: `team_id=eq.${activeTeam.id}` },
        () => fetchAlerts(false)
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeTeam?.id, supabase, fetchAlerts]);

  // Apply the active filters (tier / severity / search), then flatten into one
  // urgency-ordered list: tier first, then severity, then newest.
  //
  // Search is forgiving: it strips quotes/smart-quotes and matches each typed
  // word anywhere across the title, description AND affected link — so you can
  // type a bare link name (the title wraps it in quotes) and still find it,
  // in any word order.
  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/["'`“”‘’]/g, "");
    const words = norm(search).split(/\s+/).filter(Boolean);
    return alerts
      .filter((a) => {
        if (!a.alert_type) return false;
        if (tierFilter !== "all" && ALERT_TIERS[a.alert_type] !== tierFilter) return false;
        if (sevFilter !== "all" && a.severity !== sevFilter) return false;
        if (words.length) {
          const hay = norm(`${a.title} ${a.description} ${a.affected_link ?? ""}`);
          if (!words.every((w) => hay.includes(w))) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const tierDiff = ALERT_TIERS[a.alert_type!] - ALERT_TIERS[b.alert_type!];
        if (tierDiff !== 0) return tierDiff;
        const sevDiff = (SEV_WEIGHT[a.severity] ?? 1) - (SEV_WEIGHT[b.severity] ?? 1);
        if (sevDiff !== 0) return sevDiff;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [alerts, tierFilter, sevFilter, search]);

  const hasActiveFilters =
    tierFilter !== "all" || sevFilter !== "all" || search.trim() !== "";
  const clearFilters = useCallback(() => {
    setTierFilter("all"); setSevFilter("all"); setSearch("");
  }, []);

  const totals = useMemo(() => {
    const byTier: Record<AlertTier, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const a of alerts) {
      if (a.alert_type) byTier[ALERT_TIERS[a.alert_type]]++;
    }
    return { all: alerts.length, byTier };
  }, [alerts]);

  // Soft-delete via is_dismissed=true so the cron lifecycle can still
  // re-create the alert if the underlying issue recurs. Hard DELETE
  // would lose the history row in audit/anomaly_alerts.
  const [deleteCandidate, setDeleteCandidate] = useState<AlertRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    // Optimistic — remove from local list immediately, then persist.
    setAlerts((prev) => prev.filter((a) => a.id !== deleteCandidate.id));
    const { error } = await supabase
      .from("anomaly_alerts")
      .update({ is_dismissed: true })
      .eq("id", deleteCandidate.id);
    if (error) {
      toast.error(error.message);
      fetchAlerts(false); // revert by refetching the truth
    } else {
      toast.success("Alert dismissed");
    }
    setDeleteCandidate(null);
    setDeleting(false);
  };

  // ── Multi-select bulk dismiss ─────────────────────────────────────
  // The checkbox shares a slot with the severity dot: the dot is the resting
  // state, hovering (or having a selection open) swaps in the checkbox. Keeps
  // the row to one leading glyph instead of two.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const selectAllVisible = useCallback(
    () => setSelected(new Set(filtered.map((a) => a.id))),
    [filtered]
  );

  // Prune ids that leave the list (realtime refetch / dismiss) so the count stays honest.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(alerts.map((a) => a.id));
      const next = new Set<string>();
      for (const id of prev) if (ids.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [alerts]);

  const bulkDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setAlerts((prev) => prev.filter((a) => !selected.has(a.id))); // optimistic
    const { error } = await supabase
      .from("anomaly_alerts")
      .update({ is_dismissed: true })
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      fetchAlerts(false);
    } else {
      toast.success(`${ids.length} alert${ids.length === 1 ? "" : "s"} dismissed`);
    }
    clearSelection();
    setBulkConfirm(false);
    setBulkDeleting(false);
  };

  // Manual re-check — calls /api/alerts/check which runs the same detectors
  // as the cron but scoped to the active team. Available any time.
  const runChecksNow = async () => {
    if (!activeTeam?.id) {
      toast.error("Pick a team first");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: activeTeam.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't run checks");
        return;
      }
      // A run can also CLOSE alerts — a destination that came back healthy, a
      // trend that reverted. Saying "nothing new" while quietly clearing four
      // rows off the list makes the page look like it lost them.
      const parts: string[] = [];
      if (json.inserted > 0) parts.push(`${json.inserted} new`);
      if (json.closed > 0) parts.push(`${json.closed} resolved`);
      toast.success(parts.length > 0 ? parts.join(" · ") : "Re-checked, nothing new");
      fetchAlerts(false);
      setMetricsRefreshKey((n) => n + 1);
    } catch {
      toast.error("Network error");
    } finally {
      setRunning(false);
    }
  };

  const headline =
    totals.byTier[1] > 0
      ? `${totals.byTier[1]} critical`
      : totals.all > 0
        ? `${totals.all} open alert${totals.all !== 1 ? "s" : ""}`
        : "All clear";

  return (
    <div className="space-y-5 p-6">
      <Header title="Alerts" />

      <div className="max-w-4xl mx-auto w-full space-y-4 pb-24">
        {/* Status strip — plan, click usage, headline count and Check now, all
            on one line. Used to be two full-height cards stacked on top of the
            list. The plan/cap is still unmissable, it just doesn't cost a
            screenful to say so. */}
        <StatusStrip
          plan={activeTeam?.plan ?? "free"}
          headline={headline}
          critical={totals.byTier[1] > 0}
          allClear={totals.all === 0}
          running={running}
          canRun={!!activeTeam}
          onRun={runChecksNow}
        />

        {/* One filter row: tier pills (which replaced the four tier tiles AND
            the tier section headings), search, severity. */}
        {alerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <TierPill
                label="All"
                count={totals.all}
                active={tierFilter === "all"}
                accent="text-white"
                onClick={() => setTierFilter("all")}
              />
              {TIER_ORDER.map((tier) => (
                <TierPill
                  key={tier}
                  label={TIER_META[tier].title}
                  count={totals.byTier[tier]}
                  active={tierFilter === tier}
                  accent={TIER_META[tier].accent}
                  onClick={() => setTierFilter((t) => (t === tier ? "all" : tier))}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search alerts…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.02] border border-white/10 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/25"
                />
              </div>
              <Seg
                options={[
                  { v: "all", label: "All" },
                  { v: "high", label: "High" },
                  { v: "medium", label: "Med" },
                  { v: "low", label: "Low" },
                ]}
                value={sevFilter}
                onChange={setSevFilter}
              />
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Detector metrics — collapsed, directly above the list.
            It sat BELOW the list for one release and that was wrong: with 20
            open alerts you had to scroll past all of them to reach it, so the
            panel that explains why the alerts exist was the hardest thing on the
            page to find. Collapsed it costs one ~40px bar, which doesn't move no
            matter how long the list gets. */}
        {!loading && alerts.length > 0 && (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setMetricsOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 inline-flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                Detector metrics
              </span>
              <ChevronDown className={cn("w-4 h-4 text-neutral-600 transition-transform", metricsOpen && "rotate-180")} />
            </button>
            {metricsOpen && <MetricsDashboard refreshKey={metricsRefreshKey} />}
          </div>
        )}

        {/* Loading skeleton — rows, not cards, so it matches what lands. */}
        {loading && (
          <div className="rounded-2xl border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && alerts.length === 0 && (
          <Card className="glass-card border-[#00D26A]/20">
            <CardContent className="p-10 text-center">
              <div className="mx-auto w-20 h-20 rounded-3xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mb-5">
                <Sparkles className="w-9 h-9 text-[#00D26A]" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Nothing to worry about</h3>
              {/* Hedged on purpose. These are conclusions from the last scan,
                  which the daily cron may have run up to 24h ago — stating them
                  in the flat present tense promised a freshness we don't have. */}
              <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                As of the last scan: destinations responding, traffic normal, no spam patterns, and you&apos;re under your plan limit. Hit <span className="text-white font-bold">Check now</span> to re-scan against live data.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No-results state — alerts exist but the active filters hide them all. */}
        {!loading && alerts.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Search className="w-5 h-5 text-neutral-500" />
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">No alerts match your filters</h3>
            <button
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Clear filters
            </button>
          </div>
        )}

        {/* The list, grouped into labelled tier sections. The flat list read as
            one undifferentiated wall — a header per tier ("Critical",
            "Opportunities", …) gives the eye an anchor so you can find WHICH
            alert you care about without reading every row. Within a section the
            rows stay urgency-sorted. Nulls/unknown types fall into tier 4. */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-5">
            {TIER_ORDER.map((tier) => {
              const rows = filtered.filter(
                (a) => (a.alert_type ? ALERT_TIERS[a.alert_type] ?? 4 : 4) === tier
              );
              if (rows.length === 0) return null;
              const meta = TIER_META[tier];
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex items-baseline gap-2 px-1">
                    <span className={cn("text-[11px] font-black uppercase tracking-widest", meta.accent)}>
                      {meta.title}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-600 tabular-nums">{rows.length}</span>
                    <span className="text-[10px] text-neutral-600 truncate hidden sm:block">· {meta.subtitle}</span>
                  </div>
                  <div className="rounded-2xl border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden">
                    <AnimatePresence initial={false}>
                      {rows.map((a) => (
                        <motion.div
                          key={a.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                        >
                          <AlertRowItem
                            alert={a}
                            selected={selected.has(a.id)}
                            selectionActive={selected.size > 0}
                            expanded={expanded === a.id}
                            onToggleExpand={() => setExpanded((id) => (id === a.id ? null : a.id))}
                            onToggleSelect={toggleSelect}
                            onRequestDelete={setDeleteCandidate}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Bulk action bar — appears once one or more alerts are selected. */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl glass-card bg-black/90 border border-white/10 shadow-2xl">
          <span className="text-xs font-black text-white whitespace-nowrap">
            {selected.size} selected
          </span>
          <button
            onClick={selectAllVisible}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Select all
          </button>
          <button
            onClick={clearSelection}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={() => setBulkConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selected.size}
          </button>
        </div>
      )}

      {/* Bulk delete confirmation */}
      <Dialog
        open={bulkConfirm}
        onOpenChange={(o) => { if (!o && !bulkDeleting) setBulkConfirm(false); }}
      >
        <DialogContent className="glass-card bg-black/95 border-red-500/30 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-red-400 uppercase flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Dismiss {selected.size} alert{selected.size === 1 ? "" : "s"}?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium leading-relaxed">
            They&apos;ll be removed from your list. If any of the underlying issues
            happen again, Tappr will re-create the alert automatically.
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setBulkConfirm(false)}
              disabled={bulkDeleting}
              className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg disabled:opacity-50"
            >
              {bulkDeleting ? "Dismissing…" : `Dismiss ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteCandidate}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteCandidate(null); }}
      >
        <DialogContent className="glass-card bg-black/95 border-red-500/30 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-red-400 uppercase flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Dismiss this alert?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium leading-relaxed">
            {deleteCandidate && (
              <>
                You&apos;ll stop seeing <span className="text-white font-bold">&quot;{alertSubject(deleteCandidate)}&quot;</span> in your list.
                If the underlying issue happens again, Tappr will re-create the alert automatically.
              </>
            )}
          </DialogDescription>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleting}
              className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg disabled:opacity-50"
            >
              {deleting ? "Dismissing…" : "Dismiss Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────

function TierPill({
  label,
  count,
  active,
  accent,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
        active
          ? "border-white/25 bg-white/[0.06] text-white"
          : empty
            ? "border-white/[0.06] text-neutral-600 hover:text-neutral-400"
            : "border-white/10 text-neutral-400 hover:text-white hover:border-white/20"
      )}
    >
      <span className={cn(!active && !empty && accent)}>{label}</span>
      <span className={cn(
        "tabular-nums",
        active ? "text-white/60" : empty ? "text-neutral-700" : "text-neutral-500"
      )}>
        {count}
      </span>
    </button>
  );
}

// One alert = one row. Collapsed: severity dot, short code chip, subject, gist,
// age. Expanded: the full advice, the destination URL on its own line, and the
// CTAs. Clicking anywhere on the row toggles the expand.
function AlertRowItem({
  alert,
  selected,
  selectionActive,
  expanded,
  onToggleExpand,
  onToggleSelect,
  onRequestDelete,
}: {
  alert: AlertRow;
  selected: boolean;
  selectionActive: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleSelect: (id: string) => void;
  onRequestDelete: (alert: AlertRow) => void;
}) {
  const cat = alert.alert_type as AlertType;
  const Icon = CATEGORY_ICONS[cat] ?? ShieldAlert;
  const style = sevStyle(alert.severity);
  const badge = alertBadge(alert);
  const subject = alertSubject(alert);
  const summary = alertSummary(alert);
  const url = alertUrl(alert);
  // Category name is the chip's tooltip rather than a second badge — it's the
  // answer to "what kind of alert is this", which the icon already gestures at
  // and which you only actually need spelled out on demand.
  const categoryLabel = ALERT_LABELS[cat]?.label ?? "Alert";

  return (
    <div
      className={cn(
        "group relative border-l-2 transition-colors",
        style.bar,
        selected ? "bg-red-500/[0.06]" : "hover:bg-white/[0.02]"
      )}
    >
      <div
        onClick={onToggleExpand}
        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
      >
        {/* Leading slot: severity dot at rest, checkbox on hover or while a
            selection is open. One glyph, two jobs. Pinned to the first line. */}
        <div className="relative w-5 h-5 shrink-0 flex items-center justify-center mt-0.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-opacity",
              style.dot,
              (selected || selectionActive) ? "opacity-0" : "opacity-100 group-hover:opacity-0"
            )}
          />
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(alert.id); }}
            className={cn(
              "absolute inset-0 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer",
              selected
                ? "bg-red-500 border-red-500 opacity-100"
                : selectionActive
                  ? "border-white/20 hover:border-red-400/60 opacity-100"
                  : "border-white/20 hover:border-red-400/60 opacity-0 group-hover:opacity-100 focus:opacity-100"
            )}
            aria-label={selected ? "Deselect alert" : "Select alert"}
          >
            {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
        </div>

        {/* Two lines. Line 1 = the subject (what you scan for) + the one number
            the alert is about ("404", "-62%"). Line 2 = the alert category +
            a one-line gist. Keeping the bold subject on its own line, never
            sharing horizontal space with the detail, is what makes a long list
            actually scannable — the previous single-line row clipped the subject
            at 55% so titles were cut off mid-word. */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{subject}</span>
            {badge && (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center h-5 px-1.5 rounded text-[10px] font-black uppercase tracking-wider tabular-nums",
                  style.tint, style.text
                )}
              >
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 min-w-0">
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              <Icon className="w-3 h-3" />
              {categoryLabel}
            </span>
            <span className="text-xs text-neutral-500 truncate">{summary}</span>
          </div>
        </div>

        {/* Trailing controls, pinned to the first line. */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <span
            className="text-[10px] text-neutral-600 font-medium tabular-nums cursor-help hidden sm:block"
            title={formatAbsolute(alert.created_at)}
          >
            {formatRelative(alert.created_at)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRequestDelete(alert); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
            title="Dismiss this alert"
            aria-label="Dismiss this alert"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-neutral-600 transition-transform",
              expanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pl-11 pr-3 pb-3.5 space-y-3">
              <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                {summary}
              </p>

              {/* The destination URL, on its own line, in mono. This is the copy
                  that used to be buried mid-sentence in the card body. */}
              {url && (
                <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 mb-1">Destination</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-mono text-neutral-400 hover:text-white break-all inline-flex items-start gap-1.5 transition-colors"
                  >
                    {url}
                    <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" />
                  </a>
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <RowCta alert={alert} />
                <span className="text-[10px] text-neutral-600 font-medium sm:hidden">
                  {formatAbsolute(alert.created_at)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Per-type deep link out of the alert into the thing you'd fix.
function RowCta({ alert }: { alert: AlertRow }) {
  const cat = alert.alert_type as AlertType;
  const cls =
    "text-[10px] font-black uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1 transition-colors";

  const target =
    alert.affected_link
      ? { href: `/dashboard/links?slug=${encodeURIComponent(alert.affected_link)}`, label: "Open link" }
      : cat === "plan_limit" || cat === "subscription_expiring"
        ? { href: "/dashboard/billing", label: cat === "plan_limit" ? "Upgrade plan" : "Manage billing" }
        : cat === "ab_winner"
          ? { href: "/dashboard/ab-testing", label: "View test" }
          : cat === "stale_links"
            ? { href: "/dashboard/links", label: "Clean up links" }
            : null;

  if (!target) return null;
  return (
    <Link href={target.href} onClick={(e) => e.stopPropagation()} className={cls}>
      {target.label} <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

// Plan + click usage + headline + Check now, on one line. Replaces the old
// PlanBanner card and hero card, which together ran ~280px tall before the
// first alert.
function StatusStrip({
  plan,
  headline,
  critical,
  allClear,
  running,
  canRun,
  onRun,
}: {
  plan: string;
  headline: string;
  critical: boolean;
  allClear: boolean;
  running: boolean;
  canRun: boolean;
  onRun: () => void;
}) {
  const { activeTeam } = useTeam();
  const [usage, setUsage] = useState<{ used: number; cap: number; pct: number } | null>(null);

  useEffect(() => {
    if (!activeTeam?.id) return;
    let cancelled = false;
    fetch(`/api/alerts/metrics?team_id=${activeTeam.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((m) => {
        if (cancelled || !m) return;
        setUsage({ used: m.clicksThisMonth, cap: m.planCap, pct: m.monthPct });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeTeam?.id]);

  const planKey = (plan ?? "free").toLowerCase();
  const planLabel = planKey.toUpperCase();
  // No ceiling → no percentage, no progress bar. Just the count. `used / Infinity`
  // is 0 and "N / ∞ (0%)" is worse than saying nothing.
  const uncapped = !hasClickCap(planKey);
  const cap = planClickCap(planKey);

  const barColor =
    usage && usage.pct >= 100 ? "bg-red-500" :
    usage && usage.pct >= 80  ? "bg-amber-400" :
    "bg-[#00D26A]";

  const statusColor = critical
    ? "bg-red-500/10 border-red-500/30 text-red-400"
    : allClear
      ? "bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A]"
      : "bg-amber-500/10 border-amber-500/30 text-amber-400";

  return (
    <Card className="glass-card border-white/5">
      <CardContent className="p-3.5 flex items-center gap-4 flex-wrap">
        {/* Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border", statusColor)}>
            {allClear ? <ShieldCheck className="w-4.5 h-4.5" /> : <ShieldAlert className="w-4.5 h-4.5" />}
          </div>
          <div>
            <p className="text-base font-black tracking-tight text-white leading-none">{headline}</p>
            {/* Cadence must match vercel.json. The crons run once a day — a Vercel
                Hobby limit, not something we can quietly bump, so the copy has to
                be honest about it and point at "Check now". */}
            <p className="text-[10px] text-neutral-500 mt-1 leading-none">Scanned daily · re-scan any time</p>
          </div>
        </div>

        {/* Plan + usage */}
        <div className="flex-1 min-w-[180px] flex items-center gap-3">
          <Link
            href="/dashboard/billing"
            className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-white/10 bg-white/[0.03] text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/[0.06] transition-colors"
          >
            <Sparkles className="w-3 h-3 text-[#00D26A]" />
            {planLabel}
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-[10px] font-bold text-neutral-500 mb-1">
              <span className="uppercase tracking-widest">Clicks this month</span>
              <span className="text-neutral-300 tabular-nums whitespace-nowrap">
                {!usage
                  ? "…"
                  : uncapped
                    ? `${usage.used.toLocaleString()}`
                    : `${usage.used.toLocaleString()} / ${cap.toLocaleString()}`}
              </span>
            </div>
            {!uncapped && (
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: usage ? `${Math.min(usage.pct, 100)}%` : "0%" }}
                />
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onRun}
          disabled={running || !canRun}
          className="btn-primary h-9 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-black shrink-0"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", running && "animate-spin")} />
          {running ? "Checking…" : "Check now"}
        </Button>
      </CardContent>
    </Card>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days}d`;
  // Past a week "34d" stops meaning anything — show the actual date.
  return formatAbsolute(iso, { short: true });
}

// Full timestamp, in the reader's own locale and timezone. Used for the
// tooltip on every alert's age, because "3d" is not an answer to "when
// exactly did this fire" — and that's the question you have when you're
// deciding whether an alert is still relevant.
function formatAbsolute(iso: string, opts: { short?: boolean } = {}): string {
  const d = new Date(iso);
  if (opts.short) {
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
