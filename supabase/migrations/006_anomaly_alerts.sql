-- Persisted anomaly alerts for real-time detection
CREATE TABLE IF NOT EXISTS public.anomaly_alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  severity    TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  root_cause  TEXT,
  action      TEXT,
  affected_link TEXT,
  change_percent NUMERIC,
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  is_dismissed BOOLEAN    NOT NULL DEFAULT false,
  emailed     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_team_unread
  ON public.anomaly_alerts(team_id, is_read, created_at DESC);

-- RLS
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomaly_alerts_select"
  ON public.anomaly_alerts FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "anomaly_alerts_insert"
  ON public.anomaly_alerts FOR INSERT
  WITH CHECK (public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "anomaly_alerts_update"
  ON public.anomaly_alerts FOR UPDATE
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "anomaly_alerts_delete"
  ON public.anomaly_alerts FOR DELETE
  USING (public.get_team_role(team_id, auth.uid()) = 'owner');

-- Enable Realtime for this table so clients get live push
ALTER PUBLICATION supabase_realtime ADD TABLE public.anomaly_alerts;
