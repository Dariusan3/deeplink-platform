-- Collections table for grouping links
CREATE TABLE collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#00D26A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) NOT NULL
);

-- Add collection_id to links
ALTER TABLE links ADD COLUMN collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_collections_team_id ON collections(team_id);
CREATE INDEX idx_links_collection_id ON links(collection_id);

-- RLS policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view collections"
  ON collections FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Team editors can create collections"
  ON collections FOR INSERT
  WITH CHECK (
    is_team_member(team_id, auth.uid()) AND
    get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "Team editors can update collections"
  ON collections FOR UPDATE
  USING (
    is_team_member(team_id, auth.uid()) AND
    get_team_role(team_id, auth.uid()) IN ('owner', 'editor')
  );

CREATE POLICY "Team owners can delete collections"
  ON collections FOR DELETE
  USING (
    is_team_member(team_id, auth.uid()) AND
    get_team_role(team_id, auth.uid()) = 'owner'
  );
