-- Referral-only signup.
--
-- The goal is that nobody uses Tappr without arriving through a partner's
-- referral link. The obvious implementation — guard /signup — does not achieve
-- that: src/components/auth/signup-form.tsx calls supabase.auth.signUp directly
-- from the browser with NEXT_PUBLIC_SUPABASE_ANON_KEY, a key that is public by
-- design. No request passes through our server on the way to account creation,
-- so a guard on the page blocks the page, not the account.
--
-- Blocking the INSERT does not work either, because of Google.
-- signInWithOAuth cannot carry custom user metadata — which is exactly why the
-- referral code is stashed in localStorage and claimed after the fact in
-- src/app/auth/callback/route.ts. A BEFORE INSERT trigger demanding a code
-- would reject every Google signup, since at insert time the code exists
-- nowhere the database can see it.
--
-- So we gate ACCESS, not REGISTRATION. An account may be created; it can do
-- nothing until a valid referral code is attached to it. That is enforceable
-- here, cannot be bypassed from the client, and behaves identically for
-- email/password and OAuth.

-- Added as 'ok' and only THEN made 'pending_referral' by default.
--
-- Adding the column with default 'pending_referral' would stamp every existing
-- account as quarantined the moment this runs — locking out every current user
-- including the operator. Adding it as 'ok' backfills existing rows correctly,
-- and moving the default afterwards gates new signups only. No UPDATE
-- statement, and no window in which the wrong value is live.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS signup_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (signup_status IN ('pending_referral', 'ok'));

ALTER TABLE public.users
  ALTER COLUMN signup_status SET DEFAULT 'pending_referral';

COMMENT ON COLUMN public.users.signup_status IS
  'pending_referral = account exists but has no valid referral; middleware sends it to /welcome. Only service_role may change this (see guard_signup_status).';

CREATE INDEX IF NOT EXISTS idx_users_signup_status
  ON public.users(signup_status) WHERE signup_status = 'pending_referral';

-- ============================================================
-- Close the self-release bypass
-- ============================================================
--
-- users_update_own (migration 001) is
--   FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
-- which restricts WHICH ROW a user may update, not WHICH COLUMNS. A quarantined
-- account holds a valid JWT and the anon key is public, so
--
--   PATCH /rest/v1/users?id=eq.<own-id>   {"signup_status":"ok"}
--
-- would release it from the browser console. Without this trigger the entire
-- gate is decorative.
--
-- It reverts silently rather than raising, so an unrelated profile update that
-- happens to send the whole row still succeeds — it just cannot move this one
-- column. Deliberately NOT security definer: the function must see the caller's
-- role, and 'authenticated'/'anon' are precisely the two PostgREST roles a
-- browser can ever reach us with.
CREATE OR REPLACE FUNCTION public.guard_signup_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.signup_status IS DISTINCT FROM OLD.signup_status
     AND current_user IN ('authenticated', 'anon')
  THEN
    NEW.signup_status := OLD.signup_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_guard_signup_status ON public.users;
CREATE TRIGGER trg_users_guard_signup_status
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_signup_status();

-- ============================================================
-- Decide the status at signup
-- ============================================================
--
-- partner_id_for_code() comes from migration 028. Email/password signups carry
-- the code in raw_user_meta_data and land on 'ok' immediately. Google signups
-- always land on 'pending_referral' and are released by
-- /api/partner/claim-referral — the same post-hoc path referral attribution
-- already used, so no new mechanism is introduced.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, signup_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE
      WHEN public.partner_id_for_code(NEW.raw_user_meta_data->>'referral_code') IS NOT NULL
      THEN 'ok'
      ELSE 'pending_referral'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
