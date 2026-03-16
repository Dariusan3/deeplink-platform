import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";
import { useUser } from "./use-user";

export type Team = Database["public"]["Tables"]["teams"]["Row"];

export function useTeam() {
  const { user, loading: userLoading } = useUser();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTeams = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("teams")
      .select("*, team_members!inner(user_id)")
      .eq("team_members.user_id", user.id);

    if (error) {
      console.error("Error fetching teams:", error.message || error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setTeams(data as Team[]);
      // Set active team from localStorage or default to first
      const storedTeamId = localStorage.getItem("active_team_id");
      const foundTeam = data.find((t) => t.id === storedTeamId);
      setActiveTeam((foundTeam as Team) || (data[0] as Team));
    } else {
      // Create a personal team if none exists
      const newTeamName = `${user.email?.split("@")[0]}'s Team` || "Personal Team";
      const slug = newTeamName.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).substring(2, 7);

      const { data: newTeam, error: createError } = await supabase
        .from("teams")
        .insert({
          name: newTeamName,
          slug,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating personal team:", createError.message || createError);
      } else if (newTeam) {
        // Automatically add user as owner
        const { error: memberError } = await supabase.from("team_members").insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: "owner",
        });

        if (memberError) {
          console.error("Error adding owner to team:", memberError.message || memberError);
        } else {
          setTeams([newTeam]);
          setActiveTeam(newTeam);
        }
      }
    }
    setLoading(false);
  }, [user, supabase]);

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

  useEffect(() => {
    if (activeTeam) {
      localStorage.setItem("active_team_id", activeTeam.id);
    }
  }, [activeTeam]);

  return { teams, activeTeam, setActiveTeam, loading, refreshTeams: fetchTeams };
}
