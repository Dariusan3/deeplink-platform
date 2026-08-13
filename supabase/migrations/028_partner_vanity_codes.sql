-- Custom (vanity) partner referral codes.
--
-- Until now a partner's code was eight random characters generated once at
-- activation and never changeable. This adds partner-chosen codes without ever
-- invalidating an old one.
--
-- The model is ALIAS, not rename. Every code a partner has ever held stays in
-- this table and keeps resolving, forever. `is_primary` only decides which one
-- the UI presents as "your link"; resolution ignores the flag entirely. That
-- absence of a delete IS the "old links keep working" mechanism — there is no
-- separate retired state to reason about.
--
-- Codes are never released back into the pool either. If `darius` were freed
-- when its owner changed it, someone else could claim it and inherit the
-- traffic from every link the first partner ever posted.
--
-- partner_profiles.referral_code is left exactly as it is, as the canonical
-- anchor. Nothing here writes to it.

CREATE TABLE IF NOT EXISTS public.partner_codes (
  code       TEXT PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_codes_partner
  ON public.partner_codes(partner_id);

-- At most one primary code per partner. This is what makes the swap in
-- set_partner_primary_code have to be atomic.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_codes_primary
  ON public.partner_codes(partner_id) WHERE is_primary;

-- Backfill: every existing auto-generated code becomes that partner's primary.
INSERT INTO public.partner_codes (code, partner_id, is_primary)
SELECT referral_code, id, true FROM public.partner_profiles
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.partner_codes ENABLE ROW LEVEL SECURITY;

-- A partner can read their own codes (the Settings screen lists them).
-- There is deliberately no insert/update/delete policy: writes go through
-- set_partner_primary_code with the service-role key, which enforces the
-- validation and the per-partner cap.
DROP POLICY IF EXISTS "partner_codes_select_own" ON public.partner_codes;
CREATE POLICY "partner_codes_select_own" ON public.partner_codes
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM public.partner_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- Resolution
-- ============================================================

-- The same normalise-then-look-up as resolvePartnerByCode in
-- src/lib/partner-codes.ts. Duplicated in SQL on purpose: the
-- handle_new_user trigger (migration 029) needs this lookup and a trigger
-- cannot call TypeScript. The two must be changed together — the
-- normalisation (lowercase, trim, strip leading @) is the part that has to
-- stay identical.
CREATE OR REPLACE FUNCTION public.partner_id_for_code(p_code TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT partner_id FROM public.partner_codes
   WHERE code = lower(trim(ltrim(coalesce(p_code, ''), '@')));
$$;

-- ============================================================
-- Setting a partner's primary code
-- ============================================================

-- Inserting the new code and demoting the old primary must happen together.
-- As two separate statements they can interleave against
-- uq_partner_codes_primary and leave a partner with no primary code at all,
-- which blanks their referral link.
--
-- Returns the code on success. Raises:
--   'code_taken'  — the code belongs to somebody (or already to this partner)
--   'code_cap'    — this partner already holds p_max codes
CREATE OR REPLACE FUNCTION public.set_partner_primary_code(
  p_partner_id UUID,
  p_code       TEXT,
  p_max        INT DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code  TEXT := lower(trim(ltrim(coalesce(p_code, ''), '@')));
  v_owner UUID;
  v_count INT;
BEGIN
  SELECT partner_id INTO v_owner FROM public.partner_codes WHERE code = v_code;

  IF v_owner IS NOT NULL AND v_owner <> p_partner_id THEN
    RAISE EXCEPTION 'code_taken';
  END IF;

  -- Re-promoting a code this partner already owns is allowed and does not
  -- count against the cap: it is how you switch back to a previous code.
  IF v_owner IS NULL THEN
    SELECT count(*) INTO v_count FROM public.partner_codes
     WHERE partner_id = p_partner_id;
    IF v_count >= p_max THEN
      RAISE EXCEPTION 'code_cap';
    END IF;
  END IF;

  UPDATE public.partner_codes
     SET is_primary = false
   WHERE partner_id = p_partner_id AND is_primary;

  INSERT INTO public.partner_codes (code, partner_id, is_primary)
  VALUES (v_code, p_partner_id, true)
  ON CONFLICT (code) DO UPDATE SET is_primary = true;

  RETURN v_code;
END;
$$;
