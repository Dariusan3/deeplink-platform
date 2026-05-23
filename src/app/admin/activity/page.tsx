"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ScrollText,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Activity,
  CreditCard,
  UserPlus,
  Trophy,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";

// Mirrors the rows returned by /api/admin/activity. Loose JSON-style
// payload typing — the admin UI is read-only and just renders what's
// there.
type AuditRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_email: string | null;
  team_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  source: string | null;
  severity: "info" | "success" | "warning" | "error";
};

// Quick prefix filters across the top of the page. Keeps the most-asked-
// for slices one click away (payments, subscriptions, signups, partners).
const PREFIX_FILTERS = [
  { label: "All",            value: "" },
  { label: "Payments",       value: "payment" },
  { label: "Subscriptions",  value: "subscription" },
  { label: "Checkouts",      value: "billing" },
  { label: "Users",          value: "user" },
  { label: "Partners",       value: "partner" },
  { label: "Admin",          value: "admin" },
];

const SEVERITY_STYLES: Record<AuditRow["severity"], { tint: string; text: string; border: string; label: string }> = {
  info:    { tint: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30",    label: "INFO" },
  success: { tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",   border: "border-[#00D26A]/30",   label: "OK"   },
  warning: { tint: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30",   label: "WARN" },
  error:   { tint: "bg-red-500/10",     text: "text-red-400",     border: "border-red-500/30",     label: "FAIL" },
};

// Map event prefixes to a small icon — speed-read by category in the
// list view. Falls back to a generic activity icon.
function iconForEvent(eventType: string) {
  if (eventType.startsWith("payment.") || eventType.startsWith("billing."))   return CreditCard;
  if (eventType.startsWith("subscription."))                                  return CreditCard;
  if (eventType.startsWith("user."))                                          return UserPlus;
  if (eventType.startsWith("partner."))                                       return Trophy;
  if (eventType.startsWith("admin."))                                         return ShieldAlert;
  if (eventType.startsWith("team."))                                          return Settings;
  return Activity;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefix, setPrefix] = useState("");
  const [severity, setSeverity] = useState("");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const url = new URL("/api/admin/activity", window.location.origin);
    if (prefix) url.searchParams.set("prefix", prefix);
    if (severity) url.searchParams.set("severity", severity);
    if (query.trim()) url.searchParams.set("q", query.trim());
    if (dateFrom) url.searchParams.set("from", dateFrom);
    if (dateTo) url.searchParams.set("to", dateTo);
    url.searchParams.set("limit", "200");

    try {
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to load activity");
        setRows([]);
      } else {
        setRows(json.rows as AuditRow[]);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [prefix, severity, query, dateFrom, dateTo]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setPrefix(""); setSeverity(""); setQuery(""); setDateFrom(""); setDateTo("");
  };

  const hasActiveFilters = prefix || severity || query.trim() || dateFrom || dateTo;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <ScrollText className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase italic">
              Activity Log
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Every payment, subscription change, signup, and partner event — append-only audit trail.
            </p>
          </div>
        </div>
        <Button
          onClick={fetchRows}
          disabled={loading}
          variant="outline"
          className="h-9 rounded-xl border-white/10 bg-white/[0.02] gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Prefix chips */}
      <div className="flex flex-wrap gap-2">
        {PREFIX_FILTERS.map((p) => (
          <button
            key={p.value || "all"}
            onClick={() => setPrefix(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
              prefix === p.value
                ? "bg-red-500/10 text-red-400 border-red-500/30"
                : "bg-white/[0.02] text-neutral-400 border-white/5 hover:text-white hover:border-white/10"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <Card className="glass-card border-white/5">
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
              <Search className="w-3 h-3" /> Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Email, description, plan…"
                className="pl-9 pr-8 h-10 bg-white/[0.03] border-white/10 focus:border-red-500/50 rounded-lg text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5 min-w-[120px]">
            <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Severity
            </Label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-white/10 text-white text-xs font-medium outline-none focus:border-red-500/50 appearance-none cursor-pointer"
            >
              <option value="" className="bg-neutral-900">Any</option>
              <option value="info" className="bg-neutral-900">Info</option>
              <option value="success" className="bg-neutral-900">Success</option>
              <option value="warning" className="bg-neutral-900">Warning</option>
              <option value="error" className="bg-neutral-900">Error</option>
            </select>
          </div>

          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">From</Label>
            <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Any" />
          </div>

          <div className="space-y-1.5 min-w-[160px]">
            <Label className="text-[9px] font-black uppercase tracking-widest text-neutral-500">To</Label>
            <DatePicker value={dateTo} onChange={setDateTo} placeholder="Any" />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="h-10 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white gap-1.5 self-end"
            >
              <X className="w-3 h-3" />
              Reset
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Counter */}
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
        <span>{rows.length} event{rows.length !== 1 ? "s" : ""}</span>
        {rows.length === 200 && <span className="text-amber-400">· showing latest 200, narrow filters to see more</span>}
      </div>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="glass-card border-white/5 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] flex items-center justify-center mx-auto mb-4">
              <ScrollText className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-sm font-bold text-neutral-400">No events match these filters</p>
            <p className="text-xs text-neutral-600 mt-1">Reset filters or wait for new activity.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => {
            const Icon = iconForEvent(row.event_type);
            const style = SEVERITY_STYLES[row.severity];
            const open = expanded.has(row.id);
            return (
              <Card key={row.id} className={cn("glass-card border-white/5 transition-all", open && "border-white/15")}>
                <button
                  type="button"
                  onClick={() => toggleExpand(row.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-all"
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", style.tint, style.text)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-white truncate">{row.description}</p>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0",
                        style.tint, style.text
                      )}>
                        {style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 font-medium">
                      <span className="font-mono">{row.event_type}</span>
                      <span>·</span>
                      <span>{formatRelative(row.created_at)}</span>
                      {row.actor_email && (
                        <>
                          <span>·</span>
                          <span>actor: {row.actor_email}</span>
                        </>
                      )}
                      {row.target_email && row.target_email !== row.actor_email && (
                        <>
                          <span>·</span>
                          <span>target: {row.target_email}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {open
                    ? <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />}
                </button>

                {open && (
                  <div className="border-t border-white/5 px-3 py-3 space-y-2 bg-black/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
                      <KV label="created_at"      value={new Date(row.created_at).toISOString()} />
                      <KV label="event_type"     value={row.event_type} />
                      <KV label="severity"        value={row.severity} />
                      <KV label="source"          value={row.source || "—"} />
                      <KV label="team_id"         value={row.team_id || "—"} />
                      <KV label="actor_user_id"   value={row.actor_user_id || "—"} />
                      <KV label="target_user_id"  value={row.target_user_id || "—"} />
                      <KV label="target_email"    value={row.target_email || "—"} />
                    </div>
                    {row.metadata && Object.keys(row.metadata).length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Metadata</p>
                        <pre className="text-[10px] font-mono text-neutral-300 bg-black/60 border border-white/5 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(row.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-neutral-600 shrink-0">{label}:</span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}
