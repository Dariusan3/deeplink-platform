-- ================================================================
-- DeepLink Platform — Full Database Schema
-- Run this in the Supabase SQL Editor or via migrations
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS table (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TEAMS table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. TEAM_MEMBERS table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'analyst', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(team_id, user_id)
);

-- ============================================================
-- 4. LINKS table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  title TEXT,
  redirect_rules JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast slug lookups (used by redirect API)
CREATE INDEX IF NOT EXISTS idx_links_slug ON public.links(slug) WHERE is_active = true;

-- ============================================================
-- 5. LINK_CLICKS table (analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  referer TEXT,
  matched_rule_index INT DEFAULT -1
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON public.link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON public.link_clicks(clicked_at);

-- ============================================================
-- 6. BUSINESS_BRAIN table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 7. IG_INTEGRATIONS table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ig_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  ig_user_id TEXT NOT NULL,
  ig_username TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- 8. WEEKLY_REPORTS table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  report_data JSONB,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_brain ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of a team
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = team_uuid AND user_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get user's role in a team
CREATE OR REPLACE FUNCTION public.get_team_role(team_uuid UUID, user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.team_members
  WHERE team_id = team_uuid AND user_id = user_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- USERS ----
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---- TEAMS ----
CREATE POLICY "teams_select_member" ON public.teams
  FOR SELECT USING (
    public.is_team_member(id, auth.uid())
  );

CREATE POLICY "teams_insert_auth" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "teams_update_owner" ON public.teams
  FOR UPDATE USING (
    public.get_team_role(id, auth.uid()) = 'owner'
  );

CREATE POLICY "teams_delete_owner" ON public.teams
  FOR DELETE USING (
    public.get_team_role(id, auth.uid()) = 'owner'
  );

-- ---- TEAM_MEMBERS ----
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "team_members_insert_owner" ON public.team_members
  FOR INSERT WITH CHECK (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

CREATE POLICY "team_members_update_owner" ON public.team_members
  FOR UPDATE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

CREATE POLICY "team_members_delete_owner" ON public.team_members
  FOR DELETE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

-- ---- LINKS ----
CREATE POLICY "links_select_member" ON public.links
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

-- Allow anonymous read for redirect lookups
CREATE POLICY "links_select_redirect" ON public.links
  FOR SELECT USING (is_active = true)
  TO anon;

CREATE POLICY "links_insert_editor" ON public.links
  FOR INSERT WITH CHECK (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "links_update_editor" ON public.links
  FOR UPDATE USING (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "links_delete_owner" ON public.links
  FOR DELETE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

-- ---- LINK_CLICKS ----
CREATE POLICY "link_clicks_select_analyst" ON public.link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.links l
      WHERE l.id = link_id
      AND public.get_team_role(l.team_id, auth.uid()) IN ('owner', 'editor', 'analyst')
    )
  );

-- Allow inserts from anon for redirect tracking
CREATE POLICY "link_clicks_insert_anon" ON public.link_clicks
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "link_clicks_insert_auth" ON public.link_clicks
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---- BUSINESS_BRAIN ----
CREATE POLICY "business_brain_select" ON public.business_brain
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "business_brain_insert" ON public.business_brain
  FOR INSERT WITH CHECK (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "business_brain_update" ON public.business_brain
  FOR UPDATE USING (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "business_brain_delete" ON public.business_brain
  FOR DELETE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

-- ---- IG_INTEGRATIONS ----
CREATE POLICY "ig_integrations_select" ON public.ig_integrations
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "ig_integrations_insert" ON public.ig_integrations
  FOR INSERT WITH CHECK (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "ig_integrations_update" ON public.ig_integrations
  FOR UPDATE USING (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "ig_integrations_delete" ON public.ig_integrations
  FOR DELETE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

-- ---- WEEKLY_REPORTS ----
CREATE POLICY "weekly_reports_select" ON public.weekly_reports
  FOR SELECT USING (
    public.is_team_member(team_id, auth.uid())
  );

CREATE POLICY "weekly_reports_insert" ON public.weekly_reports
  FOR INSERT WITH CHECK (
    public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "weekly_reports_delete" ON public.weekly_reports
  FOR DELETE USING (
    public.get_team_role(team_id, auth.uid()) = 'owner'
  );

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_business_brain_updated_at
  BEFORE UPDATE ON public.business_brain
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
