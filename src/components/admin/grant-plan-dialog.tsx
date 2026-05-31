"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Sparkles, Crown, Zap, Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Plan = "free" | "starter" | "growth" | "agency";

interface TeamOption {
  id: string;
  name: string;
  plan: string;
}

interface GrantPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGranted: () => void;
}

const PLAN_META: Record<Plan, { label: string; icon: typeof Crown; tint: string; text: string; border: string }> = {
  free:    { label: "Free",    icon: Sparkles, tint: "bg-neutral-700/40", text: "text-neutral-300", border: "border-neutral-600/40" },
  starter: { label: "Starter", icon: Zap,      tint: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30" },
  growth:  { label: "Growth",  icon: Sparkles, tint: "bg-[#00D26A]/10",   text: "text-[#00D26A]",   border: "border-[#00D26A]/30" },
  agency:  { label: "Agency",  icon: Crown,    tint: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30" },
};

const DURATIONS = [
  { label: "7 days",    days: 7 },
  { label: "30 days",   days: 30 },
  { label: "90 days",   days: 90 },
  { label: "1 year",    days: 365 },
  { label: "Open-ended", days: null },
];

export function GrantPlanDialog({ open, onOpenChange, onGranted }: GrantPlanDialogProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<Plan>("growth");
  const [durationDays, setDurationDays] = useState<number | null>(30);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Load all teams once the dialog opens. Admin has RLS access via
  // is_admin and the teams table has no RLS gate on read for admins.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, plan")
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load teams");
        setTeams([]);
      } else {
        setTeams(data || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, supabase]);

  // Reset form when reopened so previous selections don't carry over.
  useEffect(() => {
    if (open) {
      setTeamId("");
      setSearch("");
      setPlan("growth");
      setDurationDays(30);
      setNotes("");
    }
  }, [open]);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return teams;
    const q = search.trim().toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, search]);

  const selectedTeam = teams.find((t) => t.id === teamId);

  const handleSubmit = async () => {
    if (!teamId) {
      toast.error("Pick a team first");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/grant-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          plan,
          duration_days: durationDays,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to grant plan");
        return;
      }
      toast.success(
        `Granted ${plan} to ${selectedTeam?.name ?? "team"}${durationDays ? ` for ${durationDays}d` : " open-ended"}`
      );
      onGranted();
      onOpenChange(false);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-black/95 border-red-500/30 text-white sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 uppercase italic">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
              <Gift className="w-5 h-5" />
            </div>
            Grant Plan to Team
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Team picker */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Team *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={loading ? "Loading teams…" : "Search teams by name…"}
                disabled={loading}
                className="pl-9 h-10 bg-white/[0.03] border-white/10 focus:border-red-500/50 rounded-lg text-sm"
              />
            </div>
            <div className="max-h-[180px] overflow-y-auto rounded-lg border border-white/5 bg-white/[0.01] divide-y divide-white/5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-600">No teams match</div>
              ) : (
                filteredTeams.slice(0, 50).map((t) => {
                  const isSelected = t.id === teamId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTeamId(t.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-white/[0.03] transition-all",
                        isSelected && "bg-red-500/5"
                      )}
                    >
                      <span className={cn("font-bold", isSelected ? "text-red-400" : "text-white")}>
                        {t.name}
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">
                        current: {t.plan}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {selectedTeam && (
              <p className="text-[10px] text-neutral-500 font-medium">
                Granting to <span className="text-red-400 font-bold">{selectedTeam.name}</span>
                {" "}(currently on <span className="text-white font-bold">{selectedTeam.plan}</span>)
              </p>
            )}
          </div>

          {/* Plan */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Plan *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PLAN_META) as Plan[]).map((p) => {
                const meta = PLAN_META[p];
                const Icon = meta.icon;
                const active = plan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={cn(
                      "p-3 rounded-xl border text-left flex items-center gap-2 transition-all",
                      active
                        ? `${meta.tint} ${meta.border} ring-1 ${meta.border}`
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", meta.tint, meta.text)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={cn("text-sm font-black", active ? meta.text : "text-white")}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Duration</Label>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => {
                const active = durationDays === d.days;
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setDurationDays(d.days)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                      active
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-white/[0.02] text-neutral-400 border-white/5 hover:text-white hover:border-white/10"
                    )}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-neutral-600">
              {durationDays
                ? `Plan expires in ${durationDays} days. After that, team auto-downgrades.`
                : "Open-ended grant — no automatic expiry."}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Note (optional)
            </Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='e.g. "Beta tester comp" or "Support refund"'
              className="h-10 bg-white/[0.03] border-white/10 focus:border-red-500/50 rounded-lg text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="font-bold text-white hover:bg-white/5 uppercase text-[10px] tracking-widest"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !teamId}
            className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
            {submitting ? "Granting…" : "Grant Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
