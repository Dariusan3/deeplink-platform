"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Gift,
  Crown,
  X,
  Check,
  Clock,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { GrantPlanDialog } from "@/components/admin/grant-plan-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubscriptionRow {
  id: string;
  team_id: string;
  plan: string;
  status: string;
  is_free: boolean;
  starts_at: string;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  team_name?: string;
  team_owner_email?: string;
  granted_by_name?: string;
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "cancelled">("all");
  const [grantOpen, setGrantOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  // Extracted so the grant dialog can call it after a successful grant to
  // refresh the list without a full page reload.
  const refresh = () => {
    setLoading(true);
    fetchSubs();
  };

  async function fetchSubs() {
    const { data } = await supabase
      .from("subscriptions")
      .select("*, teams(name), users!subscriptions_granted_by_fkey(full_name)")
      .order("created_at", { ascending: false });

    if (data) {
      const enriched: SubscriptionRow[] = [];
      for (const sub of data) {
        // Get team owner email
        const { data: members } = await supabase
          .from("team_members")
          .select("user_id, users(email)")
          .eq("team_id", sub.team_id)
          .eq("role", "owner")
          .limit(1);

        enriched.push({
          ...sub,
          team_name: (sub.teams as any)?.name || "Unknown",
          team_owner_email: (members?.[0] as any)?.users?.email || "",
          granted_by_name: (sub.users as any)?.full_name || null,
        });
      }
      setSubs(enriched);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const filteredSubs = useMemo(() => {
    if (filter === "all") return subs;
    return subs.filter((s) => s.status === filter);
  }, [subs, filter]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to cancel");
    } else {
      toast.success("Subscription cancelled");
      setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, status: "cancelled" } : s)));
    }
  };

  const activeSubs = subs.filter((s) => s.status === "active");
  const expiringSoon = activeSubs.filter((s) => {
    if (!s.expires_at) return false;
    const daysLeft = (new Date(s.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 7 && daysLeft > 0;
  });

  const statusColors: Record<string, { text: string; bg: string }> = {
    active: { text: "text-[#00D26A]", bg: "bg-[#00D26A]/10 border-[#00D26A]/20" },
    cancelled: { text: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    expired: { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    trial: { text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-black text-white">Subscriptions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {activeSubs.length} active · {subs.length} total
            {expiringSoon.length > 0 && (
              <span className="text-amber-400"> · {expiringSoon.length} expiring soon</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setGrantOpen(true)}
          className="h-10 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest gap-2"
        >
          <Plus className="w-4 h-4" />
          Grant Plan
        </Button>
      </div>

      <GrantPlanDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        onGranted={refresh}
      />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "active", "expired", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
              filter === f
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "border-white/5 text-neutral-500 hover:text-white"
            )}
          >
            {f} {f !== "all" && `(${subs.filter((s) => s.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Expiring soon warning */}
      {expiringSoon.length > 0 && filter !== "cancelled" && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">
              {expiringSoon.length} subscription{expiringSoon.length > 1 ? "s" : ""} expiring within 7 days
            </p>
            {expiringSoon.map((s) => (
              <p key={s.id} className="text-xs text-neutral-400 mt-1">
                {s.team_name} ({s.plan}) — expires {new Date(s.expires_at!).toLocaleDateString()}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="text-center py-16">
          <CreditCard className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">No subscriptions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSubs.map((sub) => {
            const status = statusColors[sub.status] || statusColors.active;
            const daysLeft = sub.expires_at
              ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;

            return (
              <Card key={sub.id} className="glass-card border-white/5">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={cn("p-2 rounded-xl border", status.bg)}>
                      {sub.is_free ? <Gift className="w-4 h-4 text-pink-400" /> : <CreditCard className={cn("w-4 h-4", status.text)} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{sub.team_name}</p>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                          status.bg, status.text
                        )}>
                          {sub.status}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 capitalize">
                          {sub.plan}
                        </span>
                        {sub.is_free && (
                          <span className="text-[8px] font-black text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full border border-pink-500/20">
                            GIFTED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-0.5">
                        {sub.team_owner_email}
                        {sub.granted_by_name && <> · Granted by {sub.granted_by_name}</>}
                        {sub.notes && <> · {sub.notes}</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {daysLeft !== null && sub.status === "active" && (
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-black",
                          daysLeft <= 7 ? "text-amber-400" : daysLeft <= 0 ? "text-red-400" : "text-neutral-300"
                        )}>
                          {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
                        </p>
                        <p className="text-[9px] text-neutral-600">
                          {new Date(sub.expires_at!).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {!sub.expires_at && sub.status === "active" && (
                      <span className="text-[9px] font-bold text-[#00D26A]">No expiry</span>
                    )}
                    {sub.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(sub.id)}
                        className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
