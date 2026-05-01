-- Defense-in-depth: even direct Supabase inserts (SQL editor, ad-hoc tools)
-- get destination URLs canonicalized — `https://` enforced, leading `www.`
-- stripped from the host. Mirrors the JS helper in src/lib/url-normalize.ts.

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

  -- Strip leading www. right after the scheme. Only the literal "www" —
  -- "app.example.com", "shop.example.com" stay intact.
  v := regexp_replace(v, '^https://www\.', 'https://', 'i');

  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.links_normalize_destination()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.destination_url IS NOT NULL THEN
    NEW.destination_url := public.normalize_destination_url(NEW.destination_url);
  END IF;

  -- Also normalize each rule's destination_url inside redirect_rules JSONB.
  IF NEW.redirect_rules IS NOT NULL AND jsonb_typeof(NEW.redirect_rules) = 'array' THEN
    NEW.redirect_rules := (
      SELECT jsonb_agg(
        CASE
          WHEN rule ? 'destination_url' AND jsonb_typeof(rule->'destination_url') = 'string'
            THEN jsonb_set(rule, '{destination_url}',
                   to_jsonb(public.normalize_destination_url(rule->>'destination_url')))
          ELSE rule
        END
      )
      FROM jsonb_array_elements(NEW.redirect_rules) AS rule
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS links_normalize_destination_trigger ON public.links;
CREATE TRIGGER links_normalize_destination_trigger
  BEFORE INSERT OR UPDATE OF destination_url, redirect_rules ON public.links
  FOR EACH ROW EXECUTE FUNCTION public.links_normalize_destination();

-- Backfill: normalize all existing rows once. Safe to re-run since
-- the function is idempotent.
UPDATE public.links
SET destination_url = public.normalize_destination_url(destination_url)
WHERE destination_url IS NOT NULL
  AND destination_url <> public.normalize_destination_url(destination_url);
