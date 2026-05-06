-- Reverts the www-stripping behavior from migration 016. Some destinations
-- only respond on the www subdomain, so the host is now preserved verbatim.
-- The trigger still trims, forces https, and upgrades http → https.

CREATE OR REPLACE FUNCTION public.normalize_destination_url(url TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v TEXT;
BEGIN
  IF url IS NULL THEN RETURN NULL; END IF;
  v := trim(url);
  IF v = '' THEN RETURN ''; END IF;

  -- Force protocol: no scheme → assume https
  IF v !~* '^https?://' THEN
    v := 'https://' || v;
  END IF;

  -- Upgrade http:// → https://
  v := regexp_replace(v, '^http://', 'https://', 'i');

  RETURN v;
END;
$$;
