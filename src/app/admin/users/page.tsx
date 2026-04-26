"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Users,
  CreditCard,
  Gift,
  Crown,
  X,
  Check,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UserWithTeam {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  is_admin: boolean;
  is_partner: boolean;
  teams: { id: string; name: string; plan: string }[];
  subscription?: { plan: string; status: string; is_free: boolean; expires_at: string | null } | null;
}

interface GrantSubForm {
  userId: string;
  teamId: string;
  teamName: string;
  email: string;
  plan: "starter" | "growth" | "agency";
  months: number;
  isFree: boolean;
  notes: string;
}

const PLAN_PRICES: Record<string, number> = {
  starter: 89,
  growth: 189,
  agency: 389,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantForm, setGrantForm] = useState<GrantSubForm | null>(null);
  const [granting, setGranting] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    const { data: allUsers } = await supabase
      .from("users")
      .select("id, email, full_name, created_at, is_admin, is_partner")
      .order("created_at", { ascending: false });

    if (!allUsers) { setLoading(false); return; }

    // Fetch team memberships for each user
    const enriched: UserWithTeam[] = [];
    for (const u of allUsers) {
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name, plan)")
        .eq("user_id", u.id);

      const teams = (memberships || []).map((m: any) => m.teams).filter(Boolean);

      // Get active subscription for first team
      let subscription = null;
      if (teams.length > 0) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan, status, is_free, expires_at")
          .eq("team_id", teams[0].id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        subscription = sub;
      }

      enriched.push({ ...u, teams, subscription });
    }

    setUsers(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.full_name || "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleGrantSubscription = async () => {
    if (!grantForm) return;
    setGranting(true);

    const { data: { user } } = await supabase.auth.getUser();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + grantForm.months);

    const { error } = await supabase.from("subscriptions").insert({
      team_id: grantForm.teamId,
      plan: grantForm.plan,
      status: "active",
      is_free: grantForm.isFree,
      starts_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      granted_by: user?.id || null,
      notes: grantForm.notes || null,
    });

    if (error) {
      toast.error("Failed to grant subscription: " + error.message);
    } else {
      toast.success(`${grantForm.plan} plan granted to ${grantForm.email} for ${grantForm.months} months`);
      setGrantForm(null);
      fetchUsers();
    }
    setGranting(false);
  };

  const handleToggleAdmin = async (userId: string, email: string, currentlyAdmin: boolean) => {
    // Use a server API route to bypass RLS — admin updates need service role
    const res = await fetch("/api/admin/toggle-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isAdmin: !currentlyAdmin }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update admin status");
    } else {
      toast.success(currentlyAdmin ? `${email} removed from admin` : `${email} is now admin`);
      fetchUsers();
    }
  };

  const handleTogglePartner = async (userId: string, email: string, currentlyPartner: boolean) => {
    const res = await fetch("/api/admin/partner/activate", {
      method: currentlyPartner ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to update partner status");
      return;
    }
    toast.success(
      currentlyPartner
        ? `${email} deactivated as partner`
        : `${email} is now a partner — referral link generated, welcome email sent`
    );
    fetchUsers();
  };

  const handleCancelSubscription = async (teamId: string) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("team_id", teamId)
      .eq("status", "active");

    if (error) {
      toast.error("Failed to cancel subscription");
    } else {
      toast.success("Subscription cancelled");
      fetchUsers();
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Users & Teams</h1>
        <p className="text-sm text-neutral-500 mt-1">
          {users.length} total users · Search, manage subscriptions, grant plans
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-white/[0.03] border-white/10 focus:border-red-500/50 rounded-xl"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="glass-card border-white/5">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-neutral-400">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">
                        {user.full_name || "No name"}
                      </p>
                      {user.is_admin && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          ADMIN
                        </span>
                      )}
                      {user.is_partner && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30">
                          PARTNER
                        </span>
                      )}
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.email, user.is_admin)}
                        className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-full border transition-all",
                          user.is_admin
                            ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                            : "bg-white/5 text-neutral-500 border-white/10 hover:text-red-400 hover:border-red-500/20"
                        )}
                      >
                        {user.is_admin ? "Remove Admin" : "Make Admin"}
                      </button>
                      <button
                        onClick={() => handleTogglePartner(user.id, user.email, user.is_partner)}
                        className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded-full border transition-all",
                          user.is_partner
                            ? "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/20 hover:bg-[#00D26A]/20"
                            : "bg-white/5 text-neutral-500 border-white/10 hover:text-[#00D26A] hover:border-[#00D26A]/20"
                        )}
                      >
                        {user.is_partner ? "Deactivate Partner" : "Activate Partner"}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {user.teams.map((team) => (
                        <span key={team.id} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/5">
                          {team.name} · {team.plan}
                        </span>
                      ))}
                      {user.teams.length === 0 && (
                        <span className="text-[9px] text-neutral-600">No team</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Current subscription */}
                  {user.subscription ? (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                        user.subscription.is_free
                          ? "text-pink-400 bg-pink-500/10 border-pink-500/20"
                          : "text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20"
                      )}>
                        {user.subscription.plan} {user.subscription.is_free ? "(free)" : ""}
                      </span>
                      {user.subscription.expires_at && (
                        <span className="text-[9px] text-neutral-600">
                          exp {new Date(user.subscription.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => user.teams[0] && handleCancelSubscription(user.teams[0].id)}
                        className="h-7 px-2 text-[9px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Free tier</span>
                  )}

                  {/* Grant button */}
                  {user.teams.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setGrantForm({
                          userId: user.id,
                          teamId: user.teams[0].id,
                          teamName: user.teams[0].name,
                          email: user.email,
                          plan: "starter",
                          months: 1,
                          isFree: true,
                          notes: "",
                        })
                      }
                      className="h-8 px-3 text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                    >
                      <Gift className="w-3 h-3 mr-1" />
                      Grant Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No users found</p>
            </div>
          )}
        </div>
      )}

      {/* Grant Subscription Dialog */}
      <Dialog open={!!grantForm} onOpenChange={(open) => !open && setGrantForm(null)}>
        <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Gift className="w-5 h-5 text-red-400" />
              Grant Subscription
            </DialogTitle>
          </DialogHeader>

          {grantForm && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-neutral-500">Granting to</p>
                <p className="text-sm font-bold text-white">{grantForm.email}</p>
                <p className="text-[10px] text-neutral-500">Team: {grantForm.teamName}</p>
              </div>

              {/* Plan selection */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Plan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["starter", "growth", "agency"] as const).map((plan) => (
                    <button
                      key={plan}
                      onClick={() => setGrantForm({ ...grantForm, plan })}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all",
                        grantForm.plan === plan
                          ? "bg-red-500/10 border-red-500/20"
                          : "border-white/5 hover:border-white/10"
                      )}
                    >
                      <p className="text-sm font-black text-white capitalize">{plan}</p>
                      <p className="text-[10px] text-neutral-500">${PLAN_PRICES[plan]}/mo</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Duration (months)</Label>
                <div className="flex gap-2">
                  {[1, 3, 6, 12].map((m) => (
                    <button
                      key={m}
                      onClick={() => setGrantForm({ ...grantForm, months: m })}
                      className={cn(
                        "flex-1 py-2 rounded-lg border text-xs font-black transition-all",
                        grantForm.months === m
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "border-white/5 text-neutral-500 hover:text-white"
                      )}
                    >
                      {m}mo
                    </button>
                  ))}
                </div>
              </div>

              {/* Free toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">Free (no payment)</p>
                  <p className="text-[10px] text-neutral-500">Mark as gifted — no charge</p>
                </div>
                <button
                  onClick={() => setGrantForm({ ...grantForm, isFree: !grantForm.isFree })}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all",
                    grantForm.isFree ? "bg-red-500" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white transition-all mx-0.5",
                    grantForm.isFree ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Notes (optional)</Label>
                <Input
                  placeholder="e.g. Beta tester, friend, contest winner"
                  value={grantForm.notes}
                  onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                  className="h-9 bg-white/[0.02] border-white/5 text-sm"
                />
              </div>

              {/* Summary */}
              <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-neutral-400">
                    <strong className="text-white capitalize">{grantForm.plan}</strong> plan for{" "}
                    <strong className="text-white">{grantForm.months} month{grantForm.months > 1 ? "s" : ""}</strong>
                    {grantForm.isFree ? " · Free (gifted)" : ` · $${PLAN_PRICES[grantForm.plan] * grantForm.months}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setGrantForm(null)}>Cancel</Button>
            <Button
              onClick={handleGrantSubscription}
              disabled={granting}
              className="bg-red-500 hover:bg-red-600 text-white font-black"
            >
              {granting ? "Granting..." : "Grant Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
