"use client";

import { useTeamContext } from "@/providers/team-provider";

export function useTeam() {
  return useTeamContext();
}
