-- Record when the alert detectors last ran for a team.
--
-- The alerts page tells the user "Tappr scans automatically once a day", but it
-- had no way to say *when the last scan actually happened*. That made the empty
-- state ("Nothing to worry about") a claim we couldn't back: all clear as of
-- now, or as of 23 hours ago? Nothing in the schema knew.
--
-- Written by both entry points into the detectors:
--   - src/app/api/cron/anomaly-check/route.ts  (the daily Vercel cron)
--   - src/app/api/alerts/check/route.ts        (the "Check now" button)
--
-- Nullable with no default: a team that has never been scanned reads NULL, and
-- the UI says so rather than inventing a timestamp.

alter table public.teams
  add column if not exists alerts_last_checked_at timestamptz;

comment on column public.teams.alerts_last_checked_at is
  'When the alert detectors last completed a run for this team (cron or manual "Check now"). NULL = never scanned.';
