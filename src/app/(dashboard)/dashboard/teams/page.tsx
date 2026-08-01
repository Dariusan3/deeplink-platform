"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/use-team";
import { useTeamMembers, ROLE_LABELS, ROLE_DESCRIPTIONS, TeamRole } from "@/hooks/use-team-members";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { DeleteTeamDialog } from "@/components/teams/delete-team-dialog";
import {
  Users,
  Plus,
  Shield,
  ArrowRight,
  ArrowLeft,
  Trash2,
  UserPlus,
  Crown,
  Pencil,
  Eye,
  BarChart3,
  UserMinus,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<TeamRole, React.ReactNode> = {
  owner: <Crown className="w-3.5 h-3.5" />,
  editor: <Pencil className="w-3.5 h-3.5" />,
  analyst: <BarChart3 className="w-3.5 h-3.5" />,
  viewer: <Eye className="w-3.5 h-3.5" />,
};

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  editor: "text-[#00D26A] bg-[#00D26A]/10 border-[#00D26A]/20",
  analyst: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  viewer: "text-neutral-400 bg-white/5 border-white/10",
};

export default function TeamsPage() {
  const { teams, activeTeam, setActiveTeam, loading, deleteTeam } = useTeam();
  const {
    members,
    loading: membersLoading,
    isOwner,
    currentUserRole,
    inviteMember,
    updateMemberRole,
    removeMember,
  } = useTeamMembers();

  const [activeTeamView, setActiveTeamView] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("viewer");
  const [inviting, setInviting] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
  const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("viewer");
      setInviteOpen(false);
    } catch {
      // toast already shown in hook
    }
    setInviting(false);
  };

  const handleRemove = async () => {
    if (!removeConfirm) return;
    await removeMember(removeConfirm);
    setRemoveConfirm(null);
  };

  // Team detail view with members
  if (activeTeamView) {
    const team = teams.find((t) => t.id === activeTeamView);
    if (!team) {
      setActiveTeamView(null);
      return null;
    }

    // Set this team as active if not already
    if (activeTeam?.id !== team.id) {
      setActiveTeam(team);
    }

    return (
      <>
        <Header title="Team Management" />
        <div className="p-4 md:p-6 space-y-6">
          <button
            onClick={() => setActiveTeamView(null)}
            className="flex items-center gap-2 text-sm font-bold text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </button>

          {/* Team header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center">
                <span className="text-2xl font-black text-[#00D26A]">
                  {team.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                  {team.name}
                </h2>
                <p className="text-xs text-neutral-500 font-bold">
                  {members.length} member{members.length !== 1 ? "s" : ""} &middot; slug: {team.slug}
                </p>
              </div>
            </div>
            {isOwner && (
              <Button
                onClick={() => setInviteOpen(true)}
                className="btn-primary-pulse h-10 px-6 rounded-xl text-black font-black uppercase tracking-widest text-[10px]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            )}
          </div>

          {/* Your role */}
          {currentUserRole && (
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black",
              ROLE_COLORS[currentUserRole]
            )}>
              {ROLE_ICONS[currentUserRole]}
              Your role: {ROLE_LABELS[currentUserRole]}
            </div>
          )}

          {/* Permission matrix */}
          <Card className="glass-card bg-white/[0.01] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#00D26A]" />
                Permission Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["owner", "editor", "analyst", "viewer"] as TeamRole[]).map((role) => (
                  <div
                    key={role}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      ROLE_COLORS[role]
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {ROLE_ICONS[role]}
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {ROLE_LABELS[role]}
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500 leading-relaxed">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Members list */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00D26A]" />
              Team Members
            </h3>

            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const role = member.role as TeamRole;
                  const name = member.user?.full_name || member.user?.email || "Unknown";
                  const email = member.user?.email || "";
                  const initials = name
                    .split(" ")
                    .map((n) => n.charAt(0))
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?";

                  return (
                    <Card
                      key={member.id}
                      className="glass-card bg-white/[0.01] border-white/5 hover:bg-white/[0.02] transition-all"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <Avatar className="w-10 h-10 rounded-xl border border-white/10">
                          <AvatarFallback className="bg-white/5 text-white text-xs font-black rounded-xl">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{name}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{email}</p>
                        </div>

                        {/* Role badge / dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              if (isOwner && role !== "owner") {
                                setRoleDropdown(roleDropdown === member.id ? null : member.id);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                              ROLE_COLORS[role],
                              isOwner && role !== "owner" && "cursor-pointer hover:opacity-80"
                            )}
                          >
                            {ROLE_ICONS[role]}
                            {ROLE_LABELS[role]}
                            {isOwner && role !== "owner" && (
                              <ChevronDown className="w-3 h-3 ml-1" />
                            )}
                          </button>

                          {/* Role dropdown */}
                          {roleDropdown === member.id && isOwner && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl border border-white/10 bg-black/95 shadow-2xl p-1">
                              {(["editor", "analyst", "viewer"] as TeamRole[]).map((r) => (
                                <button
                                  key={r}
                                  onClick={() => {
                                    updateMemberRole(member.id, r);
                                    setRoleDropdown(null);
                                  }}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                    role === r
                                      ? "bg-white/5 text-white"
                                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                                  )}
                                >
                                  {ROLE_ICONS[r]}
                                  {ROLE_LABELS[r]}
                                  {role === r && (
                                    <span className="ml-auto text-[#00D26A] text-[8px]">current</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        {isOwner && role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRemoveConfirm(member.id)}
                            className="h-8 w-8 text-neutral-600 hover:text-red-500 hover:bg-red-500/10"
                            title="Remove member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Invite dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-md">
            <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
              Invite Team Member
            </DialogTitle>
            <DialogDescription className="text-neutral-400 font-medium">
              Add someone to {team.name}. They must have a Tappr account.
            </DialogDescription>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold placeholder:text-neutral-600 focus:outline-none focus:border-[#00D26A]/50"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 block mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["editor", "analyst", "viewer"] as TeamRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all text-left",
                        inviteRole === r
                          ? ROLE_COLORS[r]
                          : "border-white/5 text-neutral-500 hover:border-white/10 hover:text-neutral-300"
                      )}
                    >
                      {ROLE_ICONS[r]}
                      <div>
                        <p className="font-black uppercase tracking-wide text-[10px]">
                          {ROLE_LABELS[r]}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button
                variant="ghost"
                onClick={() => setInviteOpen(false)}
                className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
                className="btn-primary-pulse text-black font-black uppercase text-[10px] tracking-widest rounded-lg"
              >
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove confirmation */}
        <Dialog open={!!removeConfirm} onOpenChange={() => setRemoveConfirm(null)}>
          <DialogContent className="glass-card bg-black/95 border-white/10 text-white sm:max-w-sm">
            <DialogTitle className="text-xl font-black tracking-tight text-white uppercase italic">
              Remove Member?
            </DialogTitle>
            <DialogDescription className="text-neutral-400 font-medium">
              This person will lose access to this team immediately.
            </DialogDescription>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="ghost"
                onClick={() => setRemoveConfirm(null)}
                className="text-white hover:bg-white/5 font-bold uppercase text-[10px] tracking-widest"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemove}
                className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-lg"
              >
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Teams list view
  return (
    <>
      <Header title="Collaborative Teams" />
      <div className="p-4 md:p-6 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              Personnel
            </h2>
            <p className="text-[10px] text-[#00D26A] font-black uppercase tracking-[0.2em] opacity-80">
              Multi-User Access &amp; Secure Collaboration
            </p>
          </div>
          <CreateTeamDialog
            nativeButton={true}
            trigger={
              <Button className="btn-primary-pulse h-12 px-8 rounded-xl text-black font-black uppercase tracking-widest text-xs">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <Card className="glass-card bg-white/[0.01] border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D26A]/20 to-transparent" />
            <CardContent className="px-8 py-20">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,210,106,0.05)] border border-[#00D26A]/10">
                  <Users className="w-10 h-10 text-[#00D26A]/40" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  Standalone Mode
                </h3>
                <p className="text-sm text-neutral-500 max-w-sm font-medium leading-relaxed">
                  You are currently operating solo. <br />
                  Create a team to distribute authority and share intelligence.
                </p>
                <CreateTeamDialog
                  nativeButton={true}
                  trigger={
                    <Button className="mt-8 btn-secondary-glass rounded-xl px-8 font-black uppercase text-xs tracking-widest h-11">
                      Establish Team
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card
                key={team.id}
                className={cn(
                  "glass-card bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 border-white/5 relative overflow-hidden group cursor-pointer",
                  activeTeam?.id === team.id &&
                    "border-[#00D26A]/30 bg-[#00D26A]/5",
                )}
                onClick={() => {
                  setActiveTeam(team);
                  setActiveTeamView(team.id);
                }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00D26A]/5 blur-[60px] rounded-full group-hover:bg-[#00D26A]/10 transition-all duration-500 -z-10 pointer-events-none" />

                <CardHeader className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0">
                      <span className="text-lg font-black text-[#00D26A] uppercase">
                        {team.name.charAt(0)}
                      </span>
                    </div>
                    {activeTeam?.id === team.id && (
                      <div className="px-2 py-1 rounded-full bg-[#39FF14]/10 text-[#39FF14] text-[8px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(57,255,20,0.1)]">
                        Current Unit
                      </div>
                    )}
                    <div onClick={(e) => e.stopPropagation()} className="ml-auto flex items-center">
                      <DeleteTeamDialog
                        team={team}
                        nativeButton={true}
                        trigger={
                          <button
                            className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        }
                      />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6 space-y-4">
                  <div>
                    <CardTitle className="text-xl font-black text-white truncate group-hover:text-[#00D26A] transition-colors">
                      {team.name}
                    </CardTitle>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">
                      Slug: {team.slug}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                        Access
                      </span>
                      <div className="flex items-center gap-1 text-[#00D26A] text-[10px] font-bold">
                        <Shield className="w-3 h-3" />
                        Manage Members
                      </div>
                    </div>
                    <ArrowRight className="ml-auto w-4 h-4 text-neutral-600 group-hover:text-[#00D26A] group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            ))}

            <CreateTeamDialog
              nativeButton={true}
              trigger={
                <button className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl border border-dashed border-white/10 hover:border-[#00D26A]/40 hover:bg-[#00D26A]/5 transition-all group min-h-[220px]">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00D26A]/10 transition-all">
                    <Plus className="w-6 h-6 text-neutral-500 group-hover:text-[#00D26A]" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-neutral-500 group-hover:text-white transition-all">
                    Create Team
                  </span>
                </button>
              }
            />
          </div>
        )}
      </div>
    </>
  );
}
