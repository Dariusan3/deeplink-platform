-- ============================================================
-- Partner records: anonymise on account deletion, keep the money
-- ============================================================
-- When a partner deletes their account we must still honour erasure of their
-- personal data, but we keep the FINANCIAL records (earnings + payouts) for
-- accounting/tax — permitted by GDPR Art. 17(3)(b) (retention for a legal
-- obligation).
--
-- Today partner_profiles.user_id CASCADEs, so deleting the user wipes the whole
-- partner tree (profile → earnings → payouts → referrals). To keep the money,
-- the profile row must SURVIVE the user's deletion, detached from the person.
--
-- This migration switches partner_profiles.user_id to ON DELETE SET NULL. The
-- app (/api/account/delete) additionally scrubs the PII the DB can't (payout
-- bank details, referred emails) before deleting the user. Amounts, referral
-- code and status are preserved.
--
-- See docs/compliance-fixes.md → "Account deletion & the partner system".

-- user_id is NOT NULL UNIQUE today — drop NOT NULL so it can be detached.
-- (UNIQUE still holds: Postgres treats NULLs as distinct, so multiple
-- anonymised profiles are allowed.)
ALTER TABLE public.partner_profiles ALTER COLUMN user_id DROP NOT NULL;

DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'public.partner_profiles'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[
      (SELECT attnum FROM pg_attribute
       WHERE attrelid = 'public.partner_profiles'::regclass AND attname = 'user_id')
    ];
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.partner_profiles DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.partner_profiles
  ADD CONSTRAINT partner_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Mark anonymised profiles so admin views / stats can filter them out.
ALTER TABLE public.partner_profiles
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
