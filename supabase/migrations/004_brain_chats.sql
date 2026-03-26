-- ============================================================
-- Add plan column to teams
-- ============================================================
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'starter', 'growth', 'agency'));

-- ============================================================
-- Brain Chats table — persistent AI Brain chat sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brain_chats (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'New Chat',
  messages   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_chats_team_id_updated
  ON public.brain_chats(team_id, updated_at DESC);

-- RLS
ALTER TABLE public.brain_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brain_chats_select"
  ON public.brain_chats FOR SELECT
  USING (public.is_team_member(team_id, auth.uid()));

CREATE POLICY "brain_chats_insert"
  ON public.brain_chats FOR INSERT
  WITH CHECK (public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "brain_chats_update"
  ON public.brain_chats FOR UPDATE
  USING (public.get_team_role(team_id, auth.uid()) IN ('owner', 'editor'));

CREATE POLICY "brain_chats_delete"
  ON public.brain_chats FOR DELETE
  USING (public.get_team_role(team_id, auth.uid()) = 'owner');

-- Auto-update updated_at on row change
CREATE TRIGGER trg_brain_chats_updated_at
  BEFORE UPDATE ON public.brain_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
