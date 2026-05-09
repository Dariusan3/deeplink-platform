-- Track FanBasis identifiers on each subscription so the webhook can map
-- incoming events back to the right Tappr team without guessing.
--   * fanbasis_checkout_session_id — numeric internal id from POST /checkout-sessions
--   * fanbasis_product_id          — 5-char public id (also embedded in payment_link)
--   * fanbasis_subscription_id     — set on subscription.created, used to match
--                                    later renew/cancel events to the row
--   * customer_email               — buyer email captured at checkout time
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS fanbasis_checkout_session_id BIGINT,
  ADD COLUMN IF NOT EXISTS fanbasis_product_id          TEXT,
  ADD COLUMN IF NOT EXISTS fanbasis_subscription_id     BIGINT,
  ADD COLUMN IF NOT EXISTS customer_email               TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_fb_checkout
  ON public.subscriptions(fanbasis_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_fb_subscription
  ON public.subscriptions(fanbasis_subscription_id);

-- Allow the service-role webhook handler to insert/update on its own —
-- the existing RLS only lets team members SELECT and admins do anything.
CREATE POLICY "subscriptions_service_role_all"
  ON public.subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
