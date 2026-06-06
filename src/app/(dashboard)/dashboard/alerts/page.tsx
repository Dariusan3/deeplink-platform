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
  type AlertType,
  type AlertSeverity,
  type AlertTier,
} from "@/lib/alerts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MetricsDashboard } from "@/components/alerts/metrics-dashboard";
import {
  ShieldCheck,
  ShieldAlert,
  Link2,
  TrendingDown,
  Gauge,
  Trophy,
  Target,
  Rocket,
  Clock,
  Globe,
  Smartphone,
  Trash2,
  CreditCard,
  ChevronRight,
  Check,
  Sparkles,
  RefreshCw,
} from "lucide-react";

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

// Visual style per alert type. Tier 1 = red/amber, Tier 2 = green (good
// news), Tier 3 = amber/blue, Tier 4 = neutral.
const CATEGORY_STYLES: Record<AlertType, {
  Icon: typeof ShieldAlert;
  tint: string;
  text: string;
  border: string;
  ring: string;
}> = {
  // Tier 1
  destination_broken:    { Icon: Link2,        tint: "bg-red-500/10",     text: "text-red-400",      border: "border-red-500/30",     ring: "ring-red-500/20" },
  click_drop:            { Icon: TrendingDown, tint: "bg-amber-500/10",   text: "text-amber-400",    border: "border-amber-500/30",   ring: "ring-amber-500/20" },
  click_spam:            { Icon: ShieldAlert,  tint: "bg-purple-500/10",  text: "text-purple-400",   border: "border-purple-500/30",  ring: "ring-purple-500/20" },
  plan_limit:            { Icon: Gauge,        tint: "bg-blue-500/10",    text: "text-blue-400",     border: "border-blue-500/30",    ring: "ring-blue-500/20" },
  // Tier 2 — opportunity / good news → green family
  ab_winner:             { Icon: Trophy,       tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",    border: "border-[#00D26A]/30",   ring: "ring-[#00D26A]/20" },
  goal_hit:              { Icon: Target,       tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",    border: "border-[#00D26A]/30",   ring: "ring-[#00D26A]/20" },
  traffic_spike:         { Icon: Rocket,       tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",    border: "border-[#00D26A]/30",   ring: "ring-[#00D26A]/20" },
  peak_hour_shift:       { Icon: Clock,        tint: "bg-cyan-500/10",    text: "text-cyan-400",     border: "border-cyan-500/30",    ring: "ring-cyan-500/20" },
  // Tier 3 — strategic
  country_shift:         { Icon: Globe,        tint: "bg-amber-500/10",   text: "text-amber-400",    border: "border-amber-500/30",   ring: "ring-amber-500/20" },
  device_shift:          { Icon: Smartphone,   tint: "bg-amber-500/10",   text: "text-amber-400",    border: "border-amber-500/30",   ring: "ring-amber-500/20" },
  stale_links:           { Icon: Trash2,       tint: "bg-neutral-500/10", text: "text-neutral-400",  border: "border-neutral-500/30", ring: "ring-neutral-500/20" },
  // Tier 4 — ops
  subscription_expiring: { Icon: CreditCard,   tint: "bg-blue-500/10",    text: "text-blue-400",     border: "border-blue-500/30",    ring: "ring-blue-500/20" },
};

const TIER_ORDER: AlertTier[] = [1, 2, 3, 4];

export default function AlertsPage() {
  const { activeTeam } = useTeam();
  const supabase = useMemo(() => createClient(), []);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  // Bumped after a successful manual re-check — drives the metrics
  // dashboard to refetch so the visible numbers match the new alerts.
  const [metricsRefreshKey, setMetricsRefreshKey] = useState(0);

  const fetchAlerts = useCallback(async (showLoading = false) => {
    if (!activeTeam?.id) return;
    // Only show the skeleton on the initial load. Realtime-triggered
    // refetches (ack, dismiss, cron insert) used to flip loading=true
    // and flash the skeleton over the existing list — a visible flicker
    // every time the user ticked a checkbox.
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from("anomaly_alerts")
      .select("*")
      .eq("team_id", activeTeam.id)
      .eq("is_dismissed", false)
      .not("alert_type", "is", null)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error) setAlerts((data || []) as AlertRow[]);
    if (showLoading) setLoading(false);
  }, [activeTeam?.id, supabase]);

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

  // Group alerts by tier → by alert_type.
  const groupedByTier = useMemo(() => {
    const tiers: Record<AlertTier, Partial<Record<AlertType, AlertRow[]>>> = { 1: {}, 2: {}, 3: {}, 4: {} };
    for (const a of alerts) {
      if (!a.alert_type) continue;
      const tier = ALERT_TIERS[a.alert_type];
      (tiers[tier][a.alert_type] ||= []).push(a);
    }
    return tiers;
  }, [alerts]);

  const totals = useMemo(() => {
    const ackable = alerts.filter((a) => !a.acknowledged_at).length;
    const byTier: Record<AlertTier, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const a of alerts) {
      if (a.alert_type) byTier[ALERT_TIERS[a.alert_type]]++;
    }
    return { all: alerts.length, ackable, byTier };
  }, [alerts]);

  const setAcked = async (id: string, acked: boolean) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged_at: acked ? new Date().toISOString() : null } : a)));
    const { error } = await supabase
      .from("anomaly_alerts")
      .update({ acknowledged_at: acked ? new Date().toISOString() : null, re_verified_after_ack: false })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

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
      if (json.inserted > 0) {
        toast.success(`${json.inserted} new alert${json.inserted === 1 ? "" : "s"}`);
      } else {
        toast.success("Re-checked — nothing new");
      }
      fetchAlerts(false);
      setMetricsRefreshKey((n) => n + 1);
    } catch {
      toast.error("Network error");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Header title="Alerts" />

      <div className="max-w-5xl mx-auto w-full space-y-6 pb-20">
        {/* Plan banner — always visible at the very top so the user
            always knows which plan / click cap they're on. */}
        <PlanBanner activeTeamPlan={activeTeam?.plan ?? "free"} />

        {/* Hero header */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border",
                totals.byTier[1] > 0
                  ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
                  : totals.ackable > 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
                    : "bg-[#00D26A]/10 border-[#00D26A]/30 text-[#00D26A] shadow-[0_0_30px_rgba(0,210,106,0.15)]"
              )}>
                {totals.ackable > 0 ? <ShieldAlert className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">
                  {totals.byTier[1] > 0
                    ? `${totals.byTier[1]} critical alert${totals.byTier[1] !== 1 ? "s" : ""}`
                    : totals.ackable > 0
                      ? `${totals.ackable} alert${totals.ackable !== 1 ? "s" : ""} to review`
                      : "All clear"}
                </h2>
                <p className="text-sm text-neutral-400 mt-1 max-w-xl">
                  Tappr auto-checks every 3 hours. Use <span className="text-white font-bold">Check now</span> any time to refresh manually. Tick alerts as you investigate — they re-verify on the next run and clear themselves when resolved.
                </p>
              </div>
            </div>
            <Button
              onClick={runChecksNow}
              disabled={running || !activeTeam}
              className="btn-primary h-11 px-5 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 text-black"
            >
              <RefreshCw className={cn("w-4 h-4", running && "animate-spin")} />
              {running ? "Checking…" : "Check now"}
            </Button>
          </CardContent>
        </Card>

        {/* Live metrics dashboard — visible always, not just behind "Check now" */}
        <MetricsDashboard refreshKey={metricsRefreshKey} />

        {/* Category breakdown chips */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIER_ORDER.map((tier) => {
              const meta = TIER_META[tier];
              const count = totals.byTier[tier];
              return (
                <div
                  key={tier}
                  className={cn(
                    "rounded-2xl border bg-white/[0.01] p-4",
                    count > 0 ? "border-white/10" : "border-white/5 opacity-50"
                  )}
                >
                  <p className={cn("text-[10px] font-black uppercase tracking-widest", count > 0 ? meta.accent : "text-neutral-500")}>{meta.title}</p>
                  <p className={cn("text-3xl font-black tracking-tight mt-2", count > 0 ? meta.accent : "text-neutral-600")}>
                    {count}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1 font-medium leading-tight">{meta.subtitle}</p>
                </div>
              );
            })}
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
              <p className="text-sm text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
                All your destinations respond fine, traffic looks normal, no spam patterns, and you&apos;re comfortably under your plan limit. Hit <span className="text-white font-bold">Check now</span> any time to re-scan.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Tier sections */}
        {!loading && TIER_ORDER.map((tier) => {
          const tierMap = groupedByTier[tier];
          const types = Object.keys(tierMap) as AlertType[];
          if (types.length === 0) return null;
          const tMeta = TIER_META[tier];
          return (
            <section key={tier} className="space-y-4">
              <div className="pl-1">
                <h2 className={cn("text-base font-black tracking-tight uppercase italic", tMeta.accent)}>{tMeta.title}</h2>
                <p className="text-[11px] text-neutral-500 font-medium">{tMeta.subtitle}</p>
              </div>

              <div className="space-y-4">
                {types.map((cat) => {
                  const list = tierMap[cat] || [];
                  if (list.length === 0) return null;
                  const meta = ALERT_LABELS[cat];
                  const style = CATEGORY_STYLES[cat];
                  const ackedCount = list.filter((a) => a.acknowledged_at).length;
                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-center gap-3 pl-1">
                        <span className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest", style.tint, style.text, style.border)}>
                          <span className="text-sm leading-none">{meta.emoji}</span>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold">
                          {list.length} open · {ackedCount} verified
                        </span>
                      </div>

                      {list.map((a) => (
                        <AlertCard
                          key={a.id}
                          alert={a}
                          onToggleAck={setAcked}
                          onRequestDelete={setDeleteCandidate}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* How it works */}
        <Card className="glass-card border-white/5">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">How alerts work</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-neutral-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <p><span className="font-bold text-white">Auto-check every 3 hours.</span> Manual re-check is always available — hit the button.</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <p><span className="font-bold text-white">Tick = verified.</span> The alert stays visible and re-checks on the next run.</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <p><span className="font-bold text-white">Auto-clear.</span> When the underlying issue is gone on the next check, the alert dismisses itself.</p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#00D26A] shrink-0 mt-0.5" />
                <p><span className="font-bold text-white">No duplicates.</span> The same problem never spawns two alerts — they merge into one row.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteCandidate}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteCandidate(null); }}
      >
        <DialogContent className="glass-card bg-black/95 border-red-500/30 text-white sm:max-w-100">
          <DialogTitle className="text-xl font-black tracking-tight text-red-400 uppercase italic flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Dismiss this alert?
          </DialogTitle>
          <DialogDescription className="text-neutral-400 font-medium leading-relaxed">
            {deleteCandidate && (
              <>
                You&apos;ll stop seeing <span className="text-white font-bold">&quot;{deleteCandidate.title}&quot;</span> in your list.
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

function AlertCard({
  alert,
  onToggleAck,
  onRequestDelete,
}: {
  alert: AlertRow;
  onToggleAck: (id: string, acked: boolean) => void;
  onRequestDelete: (alert: AlertRow) => void;
}) {
  const cat = alert.alert_type as AlertType;
  const style = CATEGORY_STYLES[cat];
  const Icon = style.Icon;
  const acked = !!alert.acknowledged_at;

  return (
    <Card className={cn(
      "glass-card transition-all group",
      acked ? "border-white/5 opacity-70" : style.border + " ring-1 " + style.ring
    )}>
      <CardContent className="p-4 flex items-start gap-3">
        {/* Ack checkbox */}
        <button
          onClick={() => onToggleAck(alert.id, !acked)}
          className={cn(
            "w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
            acked
              ? "bg-[#00D26A] border-[#00D26A] shadow-[0_0_15px_rgba(0,210,106,0.4)]"
              : "border-white/20 hover:border-white/40 hover:bg-white/5"
          )}
          aria-label={acked ? "Mark as unverified" : "Mark as verified"}
          title={acked ? "I haven't checked this yet" : "I've investigated this"}
        >
          {acked && <Check className="w-4 h-4 text-black" strokeWidth={3} />}
        </button>

        {/* Icon */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", style.tint, style.text)}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn("text-sm font-black", acked ? "text-neutral-400 line-through" : "text-white")}>
              {alert.title}
            </h3>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
              alert.severity === "high" && "bg-red-500/10 text-red-400",
              alert.severity === "medium" && "bg-amber-500/10 text-amber-400",
              alert.severity === "low" && "bg-[#00D26A]/10 text-[#00D26A]"
            )}>
              {alert.severity}
            </span>
            {acked && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-[#00D26A]/10 text-[#00D26A]">
                Verified · re-checking
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {alert.description}
          </p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-[10px] text-neutral-600 font-medium">
              {formatRelative(alert.created_at)}
            </span>
            {/* Tier-specific deep links / CTAs */}
            {alert.affected_link && (
              <Link
                href={`/dashboard/links?slug=${encodeURIComponent(alert.affected_link)}`}
                className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
              >
                Open link <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {cat === "plan_limit" && (
              <Link
                href="/dashboard/billing"
                className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
              >
                Upgrade plan <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {cat === "ab_winner" && (
              <Link
                href="/dashboard/ab-testing"
                className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
              >
                View test <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {cat === "subscription_expiring" && (
              <Link
                href="/dashboard/billing"
                className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
              >
                Manage billing <ChevronRight className="w-3 h-3" />
              </Link>
            )}
            {cat === "stale_links" && (
              <Link
                href="/dashboard/links"
                className="text-[10px] font-bold uppercase tracking-widest text-[#00D26A] hover:text-[#39FF14] inline-flex items-center gap-1"
              >
                Clean up links <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </div>

        {/* Delete button — visible on hover (or always on touch). Opens
            a confirmation dialog before dismissing the row. */}
        <button
          onClick={() => onRequestDelete(alert)}
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
          title="Delete this alert"
          aria-label="Delete this alert"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
}

// Prominent plan banner shown at the very top of the alerts page. Fetches
// monthly click usage from /api/alerts/metrics so the progress bar reflects
// the same numbers as the plan_limit detector.
function PlanBanner({ activeTeamPlan }: { activeTeamPlan: string }) {
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

  const planKey = (activeTeamPlan ?? "free").toLowerCase();
  const planMeta = {
    free:    { label: "FREE",    capLabel: "500 clicks/mo",       accent: "text-neutral-300", chip: "bg-neutral-700/30 border-neutral-600/40", bar: "bg-neutral-400" },
    starter: { label: "STARTER", capLabel: "50,000 clicks/mo",    accent: "text-blue-400",    chip: "bg-blue-500/10 border-blue-500/30",       bar: "bg-blue-400" },
    growth:  { label: "GROWTH",  capLabel: "250,000 clicks/mo",   accent: "text-[#00D26A]",   chip: "bg-[#00D26A]/10 border-[#00D26A]/30",     bar: "bg-[#00D26A]" },
    agency:  { label: "AGENCY",  capLabel: "1,000,000 clicks/mo", accent: "text-amber-400",   chip: "bg-amber-500/10 border-amber-500/30",     bar: "bg-amber-400" },
  }[planKey] ?? { label: planKey.toUpperCase(), capLabel: "", accent: "text-white", chip: "bg-white/5 border-white/10", bar: "bg-white" };

  const barColor =
    usage && usage.pct >= 100 ? "bg-red-500" :
    usage && usage.pct >= 80  ? "bg-amber-400" :
    planMeta.bar;

  return (
    <Card className="glass-card border-white/5">
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", planMeta.chip)}>
            <Sparkles className={cn("w-5 h-5", planMeta.accent)} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 leading-none">Your plan</p>
            <p className={cn("text-2xl font-black tracking-tight leading-none mt-1", planMeta.accent)}>{planMeta.label}</p>
            <p className="text-[10px] text-neutral-500 mt-1 font-medium">{planMeta.capLabel}</p>
          </div>
        </div>

        {/* Usage bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1.5">
            <span>Click usage this month</span>
            <span className="text-white">
              {usage
                ? `${usage.used.toLocaleString()} / ${usage.cap.toLocaleString()} (${usage.pct}%)`
                : "Loading…"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", barColor)}
              style={{ width: usage ? `${Math.min(usage.pct, 100)}%` : "0%" }}
            />
          </div>
          {usage && usage.pct >= 80 && (
            <p className={cn("text-[10px] font-bold mt-1.5", usage.pct >= 100 ? "text-red-400" : "text-amber-400")}>
              {usage.pct >= 100
                ? "You've hit your monthly cap. New visitors see the paused page until upgrade or reset."
                : "You're close to your monthly cap. Consider upgrading before it runs out."}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="shrink-0">
          {planKey === "agency" ? (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-white/10 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-colors"
            >
              Manage billing
            </Link>
          ) : (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl btn-primary-pulse text-black text-[10px] font-black uppercase tracking-widest"
            >
              Upgrade plan <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
