-- ============================================================
-- Partner System (full spec)
-- - 25% commission, recurring on referred user's plan
-- - Activated manually by admin via is_partner flag
-- - Public referral capture: tappr.me/?ref=<code>
-- ============================================================

-- 1. Add partner flag to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_activated_at TIMESTAMPTZ;

-- 2. partner_profiles — one per activated partner
CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code    TEXT NOT NULL UNIQUE,
  commission_rate  NUMERIC NOT NULL DEFAULT 0.25,
  total_earned     NUMERIC NOT NULL DEFAULT 0,
  pending_payout   NUMERIC NOT NULL DEFAULT 0,
  payout_method    JSONB,
  activated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_referral_code ON public.partner_profiles(referral_code);

-- 3. partner_referrals — one row per signup that came through a partner's link
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  referred_user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_email     TEXT NOT NULL,
  plan               TEXT,
  monthly_value      NUMERIC NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'churned')),
  signed_up_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at       TIMESTAMPTZ,
  UNIQUE (partner_id, referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_status ON public.partner_referrals(status);

-- 4. partner_earnings — every commission credited (one row per month per referral)
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  referral_id   UUID REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  amount        NUMERIC NOT NULL,
  type          TEXT NOT NULL DEFAULT 'commission' CHECK (type IN ('commission', 'bonus')),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  period_month  DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON public.partner_earnings(partner_id, period_month DESC);

-- 5. partner_payouts — payout requests + admin processing
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  amount        NUMERIC NOT NULL,
  method        TEXT,
  status        TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'paid', 'rejected')),
  reference     TEXT,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner ON public.partner_payouts(partner_id, requested_at DESC);

-- 6. partner_suggestions — roadmap input from partners
CREATE TABLE IF NOT EXISTS public.partner_suggestions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'rejected')),
  votes         INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_suggestions_status ON public.partner_suggestions(status, votes DESC);

-- 6b. partner_suggestion_votes — junction to prevent double-voting
CREATE TABLE IF NOT EXISTS public.partner_suggestion_votes (
  suggestion_id UUID NOT NULL REFERENCES public.partner_suggestions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (suggestion_id, user_id)
);

-- 7. partner_referral_clicks — every click on a partner referral link
CREATE TABLE IF NOT EXISTS public.partner_referral_clicks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  country      TEXT,
  device       TEXT,
  converted    BOOLEAN NOT NULL DEFAULT false,
  clicked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner_time ON public.partner_referral_clicks(partner_id, clicked_at DESC);

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_suggestion_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referral_clicks ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user this partner's owner?
CREATE OR REPLACE FUNCTION public.is_partner_owner(profile_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_profiles pp
    WHERE pp.id = profile_id AND pp.user_id = auth.uid()
  );
$$;

-- All CREATE POLICY statements are preceded by DROP POLICY IF EXISTS so the
-- whole migration is idempotent — a re-run after a partial failure won't
-- error on "policy already exists".

-- partner_profiles
DROP POLICY IF EXISTS "partner sees own profile" ON public.partner_profiles;
CREATE POLICY "partner sees own profile" ON public.partner_profiles
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "partner updates own profile (payout method only via API)" ON public.partner_profiles;
CREATE POLICY "partner updates own profile (payout method only via API)"
  ON public.partner_profiles FOR UPDATE USING (user_id = auth.uid());

-- partner_referrals
DROP POLICY IF EXISTS "partner sees own referrals" ON public.partner_referrals;
CREATE POLICY "partner sees own referrals" ON public.partner_referrals
  FOR SELECT USING (public.is_partner_owner(partner_id));

-- partner_earnings
DROP POLICY IF EXISTS "partner sees own earnings" ON public.partner_earnings;
CREATE POLICY "partner sees own earnings" ON public.partner_earnings
  FOR SELECT USING (public.is_partner_owner(partner_id));

-- partner_payouts
DROP POLICY IF EXISTS "partner sees own payouts" ON public.partner_payouts;
CREATE POLICY "partner sees own payouts" ON public.partner_payouts
  FOR SELECT USING (public.is_partner_owner(partner_id));
DROP POLICY IF EXISTS "partner can request payouts" ON public.partner_payouts;
CREATE POLICY "partner can request payouts" ON public.partner_payouts
  FOR INSERT WITH CHECK (public.is_partner_owner(partner_id));

-- partner_suggestions — all partners see all suggestions (community board)
DROP POLICY IF EXISTS "partners see all suggestions" ON public.partner_suggestions;
CREATE POLICY "partners see all suggestions" ON public.partner_suggestions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_partner = true)
  );
DROP POLICY IF EXISTS "partner inserts own suggestions" ON public.partner_suggestions;
CREATE POLICY "partner inserts own suggestions" ON public.partner_suggestions
  FOR INSERT WITH CHECK (public.is_partner_owner(partner_id));

-- partner_suggestion_votes — partners can vote, see their own votes
DROP POLICY IF EXISTS "partner sees own votes" ON public.partner_suggestion_votes;
CREATE POLICY "partner sees own votes" ON public.partner_suggestion_votes
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "partner casts vote" ON public.partner_suggestion_votes;
CREATE POLICY "partner casts vote" ON public.partner_suggestion_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_partner = true)
  );
DROP POLICY IF EXISTS "partner removes own vote" ON public.partner_suggestion_votes;
CREATE POLICY "partner removes own vote" ON public.partner_suggestion_votes
  FOR DELETE USING (user_id = auth.uid());

-- partner_referral_clicks — only the owning partner can read
DROP POLICY IF EXISTS "partner sees own clicks" ON public.partner_referral_clicks;
CREATE POLICY "partner sees own clicks" ON public.partner_referral_clicks
  FOR SELECT USING (public.is_partner_owner(partner_id));

-- ============================================================
-- RPC: increment suggestion vote count atomically
-- ============================================================
CREATE OR REPLACE FUNCTION public.partner_vote_suggestion(p_suggestion_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  -- Idempotent: only insert if not already voted
  INSERT INTO public.partner_suggestion_votes (suggestion_id, user_id)
  VALUES (p_suggestion_id, v_user_id)
  ON CONFLICT (suggestion_id, user_id) DO NOTHING;

  -- Recompute vote count from the join table (cheap, suggestions are few)
  UPDATE public.partner_suggestions
  SET votes = (SELECT COUNT(*) FROM public.partner_suggestion_votes WHERE suggestion_id = p_suggestion_id)
  WHERE id = p_suggestion_id;
END;
$$;

-- ============================================================
-- Realtime publication: partner_referrals + clicks for live UI
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_referrals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_referrals';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_referral_clicks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_referral_clicks';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'partner_payouts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_payouts';
  END IF;
END $$;
