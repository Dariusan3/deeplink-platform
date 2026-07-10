-- Make a plan follow the ACCOUNT, not a single team.
--
-- Decision: a paid subscription applies to every team its owner created
-- (teams.created_by), so one subscription covers all of that user's workspaces.
-- Teams a user merely belongs to (someone else's team) are NOT affected.
--
-- Before this, `sync_team_plan` pushed a subscription's plan onto the single
-- `subscriptions.team_id`, so paying on one team left the owner's other teams —
-- and every team they created later — on 'free'.

-- Rank plans so "best plan" is well defined. Matches BRAIN_CHAT_LIMITS ordering
-- in src/lib/plan-limits.ts (free < starter < growth < agency).
CREATE OR REPLACE FUNCTION public.plan_rank(p text)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p
    WHEN 'agency'  THEN 3
    WHEN 'growth'  THEN 2
    WHEN 'starter' THEN 1
    ELSE 0                       -- 'free' and anything unrecognized
  END;
$$;

-- The highest-tier plan a user is currently entitled to, derived from the
-- active, non-expired subscriptions on the teams THEY created. 'free' if none.
CREATE OR REPLACE FUNCTION public.owner_best_plan(p_owner uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(
    (
      SELECT s.plan
      FROM public.subscriptions s
      JOIN public.teams t ON t.id = s.team_id
      WHERE t.created_by = p_owner
        AND s.status = 'active'
        AND (s.expires_at IS NULL OR s.expires_at > now())
      ORDER BY public.plan_rank(s.plan) DESC
      LIMIT 1
    ),
    'free'
  );
$$;

-- Recompute the owner's best plan and apply it to ALL teams they created.
-- Runs on any subscription change: a new active sub upgrades every owned team;
-- a cancellation/expiry recomputes and downgrades them if nothing else is
-- active. (The old version only ever upgraded, and only the one team.)
CREATE OR REPLACE FUNCTION public.sync_team_plan()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_plan  text;
BEGIN
  SELECT created_by INTO v_owner FROM public.teams WHERE id = NEW.team_id;
  IF v_owner IS NULL THEN
    RETURN NEW;
  END IF;

  v_plan := public.owner_best_plan(v_owner);
  UPDATE public.teams SET plan = v_plan
  WHERE created_by = v_owner AND plan IS DISTINCT FROM v_plan;

  RETURN NEW;
END;
$$;

-- A newly created team inherits its owner's current best plan, so a user who
-- already pays does not land on 'free' every time they make a new workspace.
-- BEFORE INSERT so the returned row (createTeam uses .select()) already carries
-- the right plan — no client refetch needed.
CREATE OR REPLACE FUNCTION public.inherit_owner_plan()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.plan := public.owner_best_plan(NEW.created_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inherit_owner_plan ON public.teams;
CREATE TRIGGER trg_inherit_owner_plan
  BEFORE INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.inherit_owner_plan();

-- The subscription trigger already exists (009); the function body above
-- replaces it. Recreate defensively in case it was dropped.
DROP TRIGGER IF EXISTS trg_sync_team_plan ON public.subscriptions;
CREATE TRIGGER trg_sync_team_plan
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_plan();

-- Backfill: align every existing team to its owner's best plan in one pass.
UPDATE public.teams t
SET plan = public.owner_best_plan(t.created_by)
WHERE t.plan IS DISTINCT FROM public.owner_best_plan(t.created_by);
