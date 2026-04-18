ALTER TABLE public.links
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- Partial index keeps sidebar favorite lookups cheap even as links scale,
-- since only a small subset will ever be favorites.
CREATE INDEX IF NOT EXISTS idx_links_favorite
  ON public.links(team_id) WHERE is_favorite = true;
