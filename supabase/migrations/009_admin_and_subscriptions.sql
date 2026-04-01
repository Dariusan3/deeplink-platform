-- Add admin flag to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Subscriptions table — tracks who has which plan and for how long
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  plan        TEXT        NOT NULL CHECK (plan IN ('free', 'starter', 'growth', 'agency')),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  is_free     BOOLEAN     NOT NULL DEFAULT false,
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  granted_by  UUID        REFERENCES public.users(id),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_team_active
  ON public.subscriptions(team_id, status, expires_at DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select"
  ON public.subscriptions FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "subscriptions_admin_all"
  ON public.subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

-- Sync team plan field when subscription is active
CREATE OR REPLACE FUNCTION public.sync_team_plan()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.teams SET plan = NEW.plan WHERE id = NEW.team_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_team_plan
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_team_plan();
