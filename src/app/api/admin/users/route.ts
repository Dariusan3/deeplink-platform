import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/admin/users
//
// Returns all users with their team memberships and the most recent
// active subscription on their primary team. Runs server-side with
// service role so we bypass the team_members RLS (which would
// otherwise hide teams the admin isn't personally a member of —
// exactly the bug that made some users show "No team" in admin).

interface TeamLite {
  id: string;
  name: string;
  plan: string;
}

interface SubscriptionLite {
  plan: string;
  status: string;
  is_free: boolean;
  expires_at: string | null;
}

export async function GET(_request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "service role missing" }, { status: 500 });
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: profile } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", authData.user.id)
    .single();
  if (!profile?.is_admin) {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  // Pull users + their team memberships + a per-team subscription in
  // bulk so we don't N+1 the database for large user lists.
  const [{ data: users }, { data: members }, { data: subs }] = await Promise.all([
    admin
      .from("users")
      .select("id, email, full_name, created_at, is_admin, is_partner")
      .order("created_at", { ascending: false }),
    admin
      .from("team_members")
      .select("user_id, role, teams(id, name, plan)"),
    admin
      .from("subscriptions")
      .select("team_id, plan, status, is_free, expires_at, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (!users) {
    return NextResponse.json({ users: [] });
  }

  // Bucket memberships by user_id for O(1) lookup. Supabase types the
  // joined `teams` as an array even for many-to-one foreign keys, so we
  // accept either shape and normalise to a single object.
  const teamsByUser = new Map<string, TeamLite[]>();
  const ownerRoleByUserTeam = new Map<string, string>();
  for (const m of members ?? []) {
    const raw = (m as { teams?: TeamLite | TeamLite[] | null }).teams;
    const team: TeamLite | null = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
    if (!team) continue;
    if (!teamsByUser.has(m.user_id)) teamsByUser.set(m.user_id, []);
    teamsByUser.get(m.user_id)!.push(team);
    ownerRoleByUserTeam.set(`${m.user_id}:${team.id}`, m.role);
  }

  // Most-recent active sub per team — first hit wins because we ordered
  // by created_at DESC.
  const subByTeam = new Map<string, SubscriptionLite>();
  for (const s of subs ?? []) {
    if (!subByTeam.has(s.team_id)) {
      subByTeam.set(s.team_id, {
        plan: s.plan,
        status: s.status,
        is_free: s.is_free,
        expires_at: s.expires_at,
      });
    }
  }

  const enriched = users.map((u) => {
    const teams = teamsByUser.get(u.id) ?? [];
    const primaryTeam = teams[0] ?? null;
    return {
      ...u,
      teams: teams.map((t) => ({
        ...t,
        role: ownerRoleByUserTeam.get(`${u.id}:${t.id}`) ?? "member",
      })),
      subscription: primaryTeam ? subByTeam.get(primaryTeam.id) ?? null : null,
    };
  });

  return NextResponse.json({ users: enriched });
}
