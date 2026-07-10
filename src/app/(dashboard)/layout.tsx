import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { UserProvider, type DbUser } from "@/providers/user-provider";
import { TeamProvider, type Team } from "@/providers/team-provider";
import { LinksProvider } from "@/providers/links-provider";
import { createClient } from "@/lib/supabase/server";
import type { Link } from "@/types/links";

// Private surface — never index, never follow. Defense in depth on top of the
// Disallow rules in src/app/robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};


export const dynamic = "force-dynamic";

// Server Component: fetch the user, profile, teams and the active team's
// links up-front so the dashboard's first paint already has real data
// instead of resolving a 4-level client provider waterfall
// (session → teams → links → stats). The providers stay client components
// (they own realtime + mutations); they just accept this server data as
// `initialData` and revalidate in the background.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProfile: DbUser | null = null;
  let initialTeams: Team[] = [];
  let initialActiveTeam: Team | null = null;
  let initialLinks: Link[] = [];

  if (user) {
    const cookieStore = await cookies();
    const activeTeamId = cookieStore.get("active_team_id")?.value ?? null;

    const [profileRes, teamsRes] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).single(),
      supabase
        .from("teams")
        .select("*, team_members!inner(user_id)")
        .eq("team_members.user_id", user.id),
    ]);

    initialProfile = (profileRes.data as DbUser | null) ?? null;
    initialTeams = (teamsRes.data ?? []) as Team[];

    if (initialTeams.length > 0) {
      // Resolve the active team from the cookie the client mirrors; fall
      // back to the first team (matches the client's default selection).
      initialActiveTeam =
        initialTeams.find((t) => t.id === activeTeamId) ?? initialTeams[0];

      const teamId = initialActiveTeam.id;
      const [linksRes, countsRes] = await Promise.all([
        supabase
          .from("links")
          .select("*")
          .eq("team_id", teamId)
          .order("created_at", { ascending: false }),
        supabase.rpc("team_link_click_counts", { p_team_id: teamId }),
      ]);

      const counts = new Map<string, number>();
      for (const row of (countsRes.data ?? []) as { link_id: string; count: number | string }[]) {
        counts.set(row.link_id, Number(row.count) || 0);
      }
      initialLinks = ((linksRes.data ?? []) as Link[]).map((l) => ({
        ...l,
        click_count: counts.get(l.id) ?? 0,
      }));
    }
  }

  return (
    <UserProvider initialUser={user} initialProfile={initialProfile}>
      <TeamProvider initialTeams={initialTeams} initialActiveTeam={initialActiveTeam}>
        <LinksProvider initialLinks={initialLinks}>
          <DashboardShell>{children}</DashboardShell>
        </LinksProvider>
      </TeamProvider>
    </UserProvider>
  );
}
