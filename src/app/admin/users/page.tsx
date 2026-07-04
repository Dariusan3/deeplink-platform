"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
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
  KeyRound,
  Copy,
  RefreshCw,
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
  starter: 97,
  growth: 297,
  agency: 997,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grantForm, setGrantForm] = useState<GrantSubForm | null>(null);
  const [granting, setGranting] = useState(false);
  const [pwForm, setPwForm] = useState<{ userId: string; email: string; password: string } | null>(null);
  const [settingPw, setSettingPw] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Use the admin server endpoint (service-role) — the previous
    // client-side query was hitting team_members RLS which hid teams
    // the admin wasn't personally a member of (making everyone but
    // themselves look like "No team").
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to load users");
        setUsers([]);
      } else {
        setUsers(json.users as UserWithTeam[]);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

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
    // Route through the central /api/admin/grant-plan endpoint so the
    // action is audited, old active subs are cancelled, and the team
    // plan is synced via the existing DB trigger.
    try {
      const res = await fetch("/api/admin/grant-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: grantForm.teamId,
          plan: grantForm.plan,
          duration_days: grantForm.months * 30,
          notes: grantForm.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to grant subscription");
      } else {
        toast.success(`${grantForm.plan} granted to ${grantForm.email} for ${grantForm.months} month${grantForm.months !== 1 ? "s" : ""}`);
        setGrantForm(null);
        fetchUsers();
      }
    } catch {
      toast.error("Network error");
    } finally {
      setGranting(false);
    }
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

  // Generate a strong random password (crypto, not Math.random) so the admin
  // can hand a user a fresh secure credential without inventing one.
  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%&*";
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
  };

  const handleSetPassword = async () => {
    if (!pwForm) return;
    if (pwForm.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSettingPw(true);
    try {
      const res = await fetch("/api/admin/users/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pwForm.userId, newPassword: pwForm.password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || "Failed to set password");
      } else {
        toast.success(`Password updated for ${pwForm.email}`);
        setPwForm(null);
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSettingPw(false);
    }
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
      <PageHeader
        eyebrow="Admin"
        title="Users & Teams"
        subtitle={`${users.length} total users · Search, manage subscriptions, grant plans`}
      />

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
                      <button
                        onClick={() => setPwForm({ userId: user.id, email: user.email, password: "" })}
                        className="text-[8px] font-black px-1.5 py-0.5 rounded-full border transition-all bg-white/5 text-neutral-500 border-white/10 hover:text-amber-400 hover:border-amber-500/20 inline-flex items-center gap-1"
                      >
                        <KeyRound className="w-2.5 h-2.5" />
                        Set Password
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
                      <p className="text-[10px] text-neutral-500">€{PLAN_PRICES[plan]}/mo</p>
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
                    {grantForm.isFree ? " · Free (gifted)" : ` · €${PLAN_PRICES[grantForm.plan] * grantForm.months}`}
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

      {/* Set Password Dialog */}
      <Dialog open={!!pwForm} onOpenChange={(open) => !open && !settingPw && setPwForm(null)}>
        <DialogContent className="glass-card bg-black/95 border-white/5 text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              Set Password
            </DialogTitle>
          </DialogHeader>

          {pwForm && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <p className="text-xs text-neutral-500">Setting a new password for</p>
                <p className="text-sm font-bold text-white">{pwForm.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  New password
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={pwForm.password}
                    onChange={(e) => setPwForm({ ...pwForm, password: e.target.value })}
                    placeholder="At least 8 characters"
                    className="h-10 bg-white/[0.02] border-white/10 text-sm font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPwForm({ ...pwForm, password: generatePassword() })}
                    className="h-10 px-3 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-amber-500/30 hover:text-amber-400"
                    title="Generate a strong password"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (!pwForm.password) return;
                      navigator.clipboard?.writeText(pwForm.password);
                      toast.success("Password copied");
                    }}
                    className="h-10 px-3 border border-white/10 hover:border-amber-500/30 hover:text-amber-400"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-neutral-600">
                  The user isn&apos;t notified — copy this and share it with them securely.
                  This action is recorded in the audit log.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPwForm(null)} disabled={settingPw}>Cancel</Button>
            <Button
              onClick={handleSetPassword}
              disabled={settingPw || !pwForm || pwForm.password.length < 8}
              className="bg-amber-500 hover:bg-amber-600 text-black font-black disabled:opacity-40"
            >
              {settingPw ? "Saving..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
