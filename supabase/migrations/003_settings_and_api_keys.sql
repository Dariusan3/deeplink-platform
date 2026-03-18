-- ============================================
-- Step 11: Team Settings table
-- ============================================

CREATE TABLE IF NOT EXISTS public.team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  -- Display settings
  show_link_creation_confirmation BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  -- Link settings
  default_domain TEXT NOT NULL DEFAULT '',
  -- Link redirect page settings
  show_app_tap_to_continue BOOLEAN NOT NULL DEFAULT true,
  show_branding BOOLEAN NOT NULL DEFAULT true,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id)
);

-- RLS
ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team settings"
  ON public.team_settings FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Team admins can insert team settings"
  ON public.team_settings FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Team admins can update team settings"
  ON public.team_settings FOR UPDATE
  USING (public.is_team_member(team_id, auth.uid()));

-- ============================================
-- Step 12: API Keys table
-- ============================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default API Key',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL, -- first 8 chars for display (e.g., "dl_a1b2...")
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_team_id ON public.api_keys(team_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team API keys"
  ON public.api_keys FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "Team members can insert API keys"
  ON public.api_keys FOR INSERT
  WITH CHECK (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "API key owner can update their keys"
  ON public.api_keys FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "API key owner can delete their keys"
  ON public.api_keys FOR DELETE
  USING (user_id = auth.uid());
