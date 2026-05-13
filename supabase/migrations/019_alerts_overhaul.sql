-- Tier 1 alerts overhaul.
--
-- We move from "anomaly_alerts" being a free-form table written by the AI
-- anomaly cron, to a typed table that powers the new /dashboard/alerts UI:
--   * alert_type: which of the Tier-1 categories the row belongs to
--   * dedup_key:  unique-per-team key so the cron can re-insert "same alert"
--                 only when the previous one was acked AND the issue is back
--   * acknowledged_at: timestamp when the user checked the "verified" box
--                 (alerts stay visible until acked; then we re-verify once
--                 more next run to confirm the issue is resolved)
--   * re_verified_after_ack: true once the re-check has run after ack — at
--                 that point we soft-dismiss the row so it leaves the list
ALTER TABLE public.anomaly_alerts
  ADD COLUMN IF NOT EXISTS alert_type             TEXT,
  ADD COLUMN IF NOT EXISTS dedup_key              TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS re_verified_after_ack  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata               JSONB;

-- Only one OPEN alert per (team, dedup_key). Once acked + re-verified the
-- row is marked is_dismissed = true and a new alert with the same dedup_key
-- can appear if the issue happens again.
CREATE UNIQUE INDEX IF NOT EXISTS uq_anomaly_alerts_open_dedup
  ON public.anomaly_alerts(team_id, dedup_key)
  WHERE is_dismissed = false AND dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_team_unread
  ON public.anomaly_alerts(team_id, is_dismissed, acknowledged_at);
