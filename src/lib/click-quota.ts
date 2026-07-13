import { unstable_cache, revalidateTag } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { planClickCap } from "@/lib/alerts";

// Monthly click cap enforcement for the redirect path.
//
// The cap used to be advisory only: `planClickCap` was read by the usage bar
// and the plan_limit alert, and by nothing else. The resolver never checked it.
// Meanwhile the alert copy told users, in as many words, "New visitors will see
// the paused page until you upgrade or the cycle resets" — which simply did not
// happen. Links kept redirecting past the cap on every plan, so Free was in
// practice unlimited.
//
// This closes that gap. It sits on the hot path, so it is cached per team:
// one count query per team per minute at most, not one per click.
//
// The reset boundary is the 1st of the calendar month, matching what the alert
// promises and what `detectPlanLimit` / `computeAlertMetrics` already measure.

const QUOTA_TTL_SECONDS = 60;

export const quotaTag = (teamId: string) => `team-quota:${teamId}`;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function computeOverCap(teamId: string): Promise<boolean> {
  if (!supabaseUrl || supabaseUrl.includes("your-supabase-url-here")) return false;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: team } = await supabase
    .from("teams")
    .select("plan")
    .eq("id", teamId)
    .maybeSingle();

  const cap = planClickCap(team?.plan as string | null);

  // Agency: no ceiling. Bail before spending a count query.
  if (!Number.isFinite(cap)) return false;

  const { data: links } = await supabase
    .from("links")
    .select("id")
    .eq("team_id", teamId);

  const linkIds = (links ?? []).map((l) => l.id as string);
  if (linkIds.length === 0) return false;

  const { count } = await supabase
    .from("link_clicks")
    .select("*", { count: "exact", head: true })
    .in("link_id", linkIds)
    .gte("clicked_at", monthStart().toISOString());

  return (count ?? 0) >= cap;
}

/**
 * Has this team burned through its monthly click allowance?
 *
 * Fails OPEN. If the lookup errors, we return false and let the click through.
 * A transient database blip must not take a paying customer's links offline —
 * over-serving for a minute is recoverable, wrongly showing every visitor a
 * "paused" page is not.
 */
export function isTeamOverClickCap(teamId: string): Promise<boolean> {
  return unstable_cache(
    () => computeOverCap(teamId).catch(() => false),
    ["team-over-click-cap", teamId],
    { tags: [quotaTag(teamId)], revalidate: QUOTA_TTL_SECONDS }
  )();
}

/**
 * Drop the cached verdict for a team. A customer who just paid to lift the cap
 * must not wait out a TTL with their links still dark.
 */
export async function invalidateTeamQuota(teamId: string) {
  revalidateTag(quotaTag(teamId), { expire: 0 });
}

/**
 * Drop the cached verdict for every team the owner of `teamId` created.
 *
 * A plan is account-wide, not per-team: `sync_team_plan` (a DB trigger on
 * `subscriptions`, see migration 024) recomputes the owner's best plan and
 * writes it to ALL the teams they created. So a single payment can lift the cap
 * on several teams at once, and invalidating only the team named on the
 * subscription would leave the others stuck behind a stale "over cap" verdict.
 *
 * This also means the plan can change without any application code running —
 * the trigger does it — which is why invalidation has to be called from every
 * route that touches `subscriptions`, not just the one that touches `teams`.
 */
export async function invalidateOwnerQuota(supabase: SupabaseClient, teamId: string) {
  const { data: team } = await supabase
    .from("teams")
    .select("created_by")
    .eq("id", teamId)
    .maybeSingle();

  const owner = team?.created_by as string | undefined;
  if (!owner) {
    await invalidateTeamQuota(teamId);
    return;
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id")
    .eq("created_by", owner);

  for (const t of teams ?? []) {
    revalidateTag(quotaTag(t.id as string), { expire: 0 });
  }
}

export type { SupabaseClient };
