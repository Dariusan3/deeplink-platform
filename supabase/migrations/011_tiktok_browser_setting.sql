ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS tiktok_browser_mode TEXT NOT NULL DEFAULT 'overlay'
  CHECK (tiktok_browser_mode IN ('overlay', 'direct'));
