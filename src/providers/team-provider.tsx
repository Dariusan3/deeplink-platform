"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useUserContext } from "./user-provider";

export type Team = Database["public"]["Tables"]["teams"]["Row"];

interface TeamContextType {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team | null) => void;
  loading: boolean;
  refreshTeams: () => Promise<void>;
  createTeam: (name: string) => Promise<Team | undefined>;
  deleteTeam: (id: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUserContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  // Stable supabase instance — avoids re-creating on every render which would
  // cause fetchTeams to get a new reference and trigger duplicate team creation
  const supabase = useMemo(() => createClient(), []);
  // Guard against concurrent fetchTeams calls (prevents duplicate team inserts)
  const isFetchingRef = useRef(false);

  const fetchTeams = useCallback(async () => {
    if (!user) return;
    // Prevent concurrent executions that would create duplicate teams
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*, team_members!inner(user_id)")
        .eq("team_members.user_id", user.id);

      if (error) {
        console.error("Error fetching teams:", error.message || error);
        return;
      }

      if (data && data.length > 0) {
        setTeams(data as Team[]);
        const storedTeamId = localStorage.getItem("active_team_id");
        const foundTeam = data.find((t: Team) => t.id === storedTeamId);
        setActiveTeam((foundTeam as Team) || (data[0] as Team));
      } else {
        const newTeamName = `${user.email?.split("@")[0]}'s Team`;
        const slug = nameToSlug(newTeamName);

        const { data: newTeam } = await supabase
          .from("teams")
          .insert({ name: newTeamName, slug, created_by: user.id })
          .select()
          .single();

        if (newTeam) {
          await supabase.from("team_members").insert({
            team_id: newTeam.id,
            user_id: user.id,
            role: "owner",
          });
          setTeams([newTeam]);
          setActiveTeam(newTeam);
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, supabase]);

  const nameToSlug = (name: string) => 
    name.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).substring(2, 7);

  const createTeam = useCallback(async (name: string) => {
    if (!user) throw new Error("Authentication required");

    const slug = nameToSlug(name);
    const { data: newTeam, error: createError } = await supabase
      .from("teams")
      .insert({ name, slug, created_by: user.id })
      .select()
      .single();

    if (createError) throw createError;

    if (newTeam) {
      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: newTeam.id,
        user_id: user.id,
        role: "owner",
      });
      if (memberError) throw memberError;

      setTeams((prev) => [...prev, newTeam]);
      setActiveTeam(newTeam);
      return newTeam;
    }
  }, [user, supabase]);

  const deleteTeam = useCallback(async (id: string) => {
    if (!user) throw new Error("Authentication required");

    // Allow deleting only if user is owner (or relies on RLS). For UI optimistically deleting:
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw error;

    setTeams((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      return remaining;
    });

    if (activeTeam?.id === id) {
      setTeams((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        setActiveTeam(remaining.length > 0 ? remaining[0] : null);
        return remaining;
      });
    }
  }, [user, supabase, activeTeam]);

  useEffect(() => {
    if (!userLoading) {
      if (user) {
        fetchTeams();
      } else {
        setTeams([]);
        setActiveTeam(null);
        setLoading(false);
      }
    }
  }, [user, userLoading, fetchTeams]);

  // Realtime subscription for teams
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`teams-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchTeams]);

  useEffect(() => {
    if (activeTeam) {
      localStorage.setItem("active_team_id", activeTeam.id);
    }
  }, [activeTeam]);

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeam, loading, refreshTeams: fetchTeams, createTeam, deleteTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeamContext() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
}
