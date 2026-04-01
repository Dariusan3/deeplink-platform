-- Add pyramid position tracking to affiliates
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS pyramid_position INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pyramid_joined_at TIMESTAMPTZ DEFAULT NULL;

-- Index for quick pyramid queries
CREATE INDEX IF NOT EXISTS idx_affiliates_pyramid
  ON public.affiliates(pyramid_position) WHERE pyramid_position IS NOT NULL;
