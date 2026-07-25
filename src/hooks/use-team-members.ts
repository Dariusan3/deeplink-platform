"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTeam } from "./use-team";
import { useUser } from "./use-user";
import { readSwrCache, writeSwrCache } from "@/lib/swr-cache";
import { planLimit, isUnlimited } from "@/lib/entitlements";
import { toast } from "sonner";

const TEAM_MEMBERS_CACHE_PREFIX = "tappr_team_members_cache_";

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export type TeamRole = "owner" | "editor" | "analyst" | "viewer";

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  editor: "Editor",
  analyst: "Analyst",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full access — manage team, members, links, and settings",
  editor: "Create and edit links, collections, and view analytics",
  analyst: "View analytics and reports only",
  viewer: "Read-only access to links and basic stats",
};

export function useTeamMembers() {
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const fetchMembers = useCallback(async () => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    if (!readSwrCache(TEAM_MEMBERS_CACHE_PREFIX, teamId)) setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*, user:users(id, email, full_name, avatar_url)")
      .eq("team_id", teamId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.error("Error fetching team members:", error.message);
    } else {
      const rows = (data || []) as TeamMember[];
      setMembers(rows);
      writeSwrCache(TEAM_MEMBERS_CACHE_PREFIX, teamId, rows);
    }
    setLoading(false);
  }, [activeTeam, supabase]);

  useEffect(() => {
    if (activeTeam?.id) {
      // Swap in cached members for this team instantly, then revalidate.
      const cached = readSwrCache<TeamMember[]>(TEAM_MEMBERS_CACHE_PREFIX, activeTeam.id);
      if (cached) setMembers(cached);
      fetchMembers();
    }
  }, [activeTeam?.id, fetchMembers]);

  // Realtime
  useEffect(() => {
    const teamId = activeTeam?.id;
    if (!teamId) return;

    const channel = supabase
      .channel(`team-members-realtime-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTeam?.id, supabase, fetchMembers]);

  const currentUserRole = useMemo(() => {
    if (!user || !members.length) return null;
    const me = members.find((m) => m.user_id === user.id);
    return (me?.role as TeamRole) || null;
  }, [user, members]);

  const isOwner = currentUserRole === "owner";

  const inviteMember = useCallback(
    async (email: string, role: TeamRole) => {
      if (!activeTeam || !user) throw new Error("Authentication required");

      // Seat cap (friendly pre-check; DB trigger in migration 026 is the real ceiling).
      const cap = planLimit(activeTeam.plan, "teamMembers");
      if (!isUnlimited(cap) && members.length >= cap) {
        const msg = cap === 1
          ? `Your ${activeTeam.plan ?? "free"} plan is single-seat. Upgrade to invite team members.`
          : `You've reached your ${activeTeam.plan ?? "free"} plan limit of ${cap} team members. Upgrade to add more.`;
        toast.error(msg);
        throw new Error(msg);
      }

      // Look up user by email
      const { data: targetUser, error: lookupError } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .single();

      if (lookupError || !targetUser) {
        toast.error("User not found. They must sign up first.");
        throw new Error("User not found");
      }

      // Check if already a member
      const existing = members.find((m) => m.user_id === targetUser.id);
      if (existing) {
        toast.error("User is already a team member");
        throw new Error("Already a member");
      }

      const { error } = await supabase.from("team_members").insert({
        team_id: activeTeam.id,
        user_id: targetUser.id,
        role,
      });

      if (error) {
        const msg = error.message?.includes("PLAN_LIMIT:")
          ? error.message.replace(/^.*PLAN_LIMIT:\s*/, "")
          : error.message || "Failed to invite member";
        toast.error(msg);
        throw error;
      }

      // This adds an EXISTING Tappr user to the team directly — no invite email
      // is sent — so don't claim we "invited" them.
      toast.success(`Added ${email} as ${ROLE_LABELS[role]}`);
      fetchMembers();
    },
    [activeTeam, user, members, supabase, fetchMembers]
  );

  const updateMemberRole = useCallback(
    async (memberId: string, newRole: TeamRole) => {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) {
        toast.error("Failed to update role");
        throw error;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`);
    },
    [supabase]
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const member = members.find((m) => m.id === memberId);
      if (member?.role === "owner") {
        toast.error("Cannot remove the team owner");
        return;
      }

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) {
        toast.error("Failed to remove member");
        throw error;
      }

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Member removed");
    },
    [members, supabase]
  );

  return {
    members,
    loading,
    currentUserRole,
    isOwner,
    inviteMember,
    updateMemberRole,
    removeMember,
    fetchMembers,
  };
}
