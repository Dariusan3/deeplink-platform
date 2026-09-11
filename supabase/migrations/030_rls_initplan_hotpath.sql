-- RLS performance: stop re-evaluating auth.uid() per row on the four tables
-- read on every single page load (DashboardLayout fetches users, teams,
-- team_members and links on every navigation).
--
-- Supabase's performance advisor flagged 72 auth_rls_initplan warnings across
-- the schema. This migration fixes only the hot-path subset — the tables
-- proven (by DashboardLayout's own fetch shape) to be hit on every request.
-- The remaining ~55 findings, spread across weekly_reports, ab_tests,
-- subscriptions, collections, and a dozen other tables, are lower-traffic and
-- deliberately left for a separate pass — this migration touches only tables
-- with a confirmed hot path, not everything the advisor flagged.
--
-- The transformation is purely mechanical and changes no access rule: writing
-- `auth.uid()` as an argument to another function (or inline in a boolean
-- expression) prevents Postgres from proving it's constant for the query, so
-- it's re-evaluated on every row scanned. Wrapping it as `(select auth.uid())`
-- lets the planner hoist it into an InitPlan — computed once per statement,
-- not once per row. See:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- At today's row counts (dozens of rows in these tables) the absolute cost is
-- small — this was verified NOT to be the primary cause of the reported
-- slowness (that was the Vercel/Supabase region mismatch, fixed separately in
-- vercel.json). This is a correctness-adjacent scaling fix, worth doing now
-- because it's cheap and risk-free while it's cheap and risk-free, not because
-- it will make today's page loads faster.

-- ── teams ────────────────────────────────────────────────────────────────
-- teams_select_member (`is_team_member(id, auth.uid())`) is a strict subset of
-- teams_select_creator (`is_team_member(id, auth.uid()) OR auth.uid() = created_by`).
-- Every row the first policy would admit, the second already admits — so it
-- never changes who can see a row, only doubles the work: Postgres evaluates
-- BOTH permissive SELECT policies and ORs the results. Dropping it is also
-- what clears one of the 41 multiple_permissive_policies findings, for free.
DROP POLICY IF EXISTS "teams_select_member" ON public.teams;

ALTER POLICY "teams_select_creator" ON public.teams
  USING (is_team_member(id, (select auth.uid())) OR ((select auth.uid()) = created_by));

ALTER POLICY "teams_insert_auth" ON public.teams
  WITH CHECK ((select auth.uid()) = created_by);

ALTER POLICY "teams_update_owner" ON public.teams
  USING (get_team_role(id, (select auth.uid())) = 'owner');

ALTER POLICY "teams_delete_owner" ON public.teams
  USING (get_team_role(id, (select auth.uid())) = 'owner');

-- ── team_members ─────────────────────────────────────────────────────────
ALTER POLICY "team_members_select" ON public.team_members
  USING (is_team_member(team_id, (select auth.uid())));

ALTER POLICY "team_members_insert_initial" ON public.team_members
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.teams
       WHERE teams.id = team_members.team_id
         AND teams.created_by = (select auth.uid())
    )
  );

ALTER POLICY "team_members_insert_owner" ON public.team_members
  WITH CHECK (get_team_role(team_id, (select auth.uid())) = 'owner');

ALTER POLICY "team_members_update_owner" ON public.team_members
  USING (get_team_role(team_id, (select auth.uid())) = 'owner');

ALTER POLICY "team_members_delete_owner" ON public.team_members
  USING (get_team_role(team_id, (select auth.uid())) = 'owner');

-- ── links ────────────────────────────────────────────────────────────────
-- links_select_redirect (is_active = true) has no auth.<fn>() call — it's the
-- policy the public [slug] redirect route relies on for anon reads — so it's
-- untouched here.
ALTER POLICY "links_select_member" ON public.links
  USING (is_team_member(team_id, (select auth.uid())));

ALTER POLICY "links_insert_editor" ON public.links
  WITH CHECK (get_team_role(team_id, (select auth.uid())) = ANY (ARRAY['owner'::text, 'editor'::text]));

ALTER POLICY "links_update_editor" ON public.links
  USING (get_team_role(team_id, (select auth.uid())) = ANY (ARRAY['owner'::text, 'editor'::text]));

ALTER POLICY "links_delete_owner" ON public.links
  USING (get_team_role(team_id, (select auth.uid())) = 'owner');

-- ── users ────────────────────────────────────────────────────────────────
-- admins_can_update_users is left with its already-known infinite-recursion
-- bug intact (self-referencing subquery on public.users — see the pre-launch
-- todo doc). Wrapping auth.uid() here is orthogonal and does not make the
-- recursion better or worse; fixing that needs a SECURITY DEFINER
-- is_admin_user() helper, which is separate, already-flagged work — not a
-- performance change, and not something to fold in silently here.
ALTER POLICY "users_insert_own" ON public.users
  WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "users_select_team_members" ON public.users
  USING (
    (select auth.uid()) = id
    OR id IN (
      SELECT tm.user_id FROM public.team_members tm
       WHERE tm.team_id IN (
         SELECT tm2.team_id FROM public.team_members tm2
          WHERE tm2.user_id = (select auth.uid())
       )
     )
    OR email IS NOT NULL
  );

ALTER POLICY "admins_can_update_users" ON public.users
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.is_admin = true));

ALTER POLICY "users_update_own" ON public.users
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);
