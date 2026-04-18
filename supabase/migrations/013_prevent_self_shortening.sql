-- Prevent creating a deeplink whose destination URL points back to the platform.
-- Blocks "link-of-a-link" loops even when the client/API validation is bypassed.

CREATE TABLE IF NOT EXISTS public.platform_blocked_hosts (
  host TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

INSERT INTO public.platform_blocked_hosts (host) VALUES
  ('linktw.in'),
  ('www.linktw.in'),
  ('dplnk.co'),
  ('www.dplnk.co'),
  ('tappr.me'),
  ('www.tappr.me')
ON CONFLICT (host) DO NOTHING;

CREATE OR REPLACE FUNCTION public.extract_hostname(url TEXT)
RETURNS TEXT AS $$
  SELECT lower(substring(url FROM '^https?://([^/?#:]+)'));
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION public.block_self_shortening()
RETURNS TRIGGER AS $$
DECLARE
  dest_host TEXT;
BEGIN
  dest_host := public.extract_hostname(NEW.destination_url);
  IF dest_host IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.platform_blocked_hosts WHERE host = dest_host
  ) THEN
    RAISE EXCEPTION 'Destination URL cannot point to this platform (blocked host: %)', dest_host
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS links_block_self_shortening ON public.links;
CREATE TRIGGER links_block_self_shortening
  BEFORE INSERT OR UPDATE OF destination_url ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.block_self_shortening();
