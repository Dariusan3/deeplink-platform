# FanBasis webhook end-to-end test

Sends a signed mock `payment.succeeded` (or any other event) to your local
or deployed `/api/webhooks/fanbasis` endpoint, exactly the way FanBasis
would. Used to verify the full chain (subscription activation + partner
commission) without spending real money.

## Your test IDs (already looked up)

```
USER_ID  = 8461d2e4-b301-4bf4-8c88-8b040e81cf27   (stanciuandrei720@gmail.com)
TEAM_ID  = f8895dbd-274b-4714-bfc4-0e98cea060a4   ("stanciuandrei720's Team", owner)
```

## Test A — subscription activation only

Just confirms the webhook arrives, signature verifies, and the team's
`subscriptions` row is created/updated to `status=active`.

```bash
# Start dev server in another terminal first
npm run dev

./scripts/test-fanbasis-webhook.sh \
  payment.succeeded \
  f8895dbd-274b-4714-bfc4-0e98cea060a4 \
  8461d2e4-b301-4bf4-8c88-8b040e81cf27 \
  growth
```

Expect: `← HTTP 200` and `{ "received": true }`.

### Verify in DB
```sql
SELECT plan, status, expires_at, fanbasis_checkout_session_id, notes
FROM public.subscriptions
WHERE team_id='f8895dbd-274b-4714-bfc4-0e98cea060a4'
ORDER BY created_at DESC LIMIT 1;
```

You should see one row with `plan=growth`, `status=active`, expires in 30
days, and `notes='Created by payment.succeeded (no prior trial row)'`.

## Test B — full partner commission flow

Sets up a pending referral (stanciuandrei referred by another partner),
fires the webhook, and verifies the commission lands.

### 1. Pick a partner to be the referrer
We have `dariusosadici@gmail.com` already on the platform with partner
profile `acfa6356-1de5-49b9-9fb2-aac5ba17e93c` (referral code `2qxkq41s`).

### 2. Seed a pending referral
Run in Supabase SQL editor or via MCP:

```sql
INSERT INTO public.partner_referrals (
  partner_id, referred_user_id, referred_email, status, monthly_value
) VALUES (
  'acfa6356-1de5-49b9-9fb2-aac5ba17e93c',
  '8461d2e4-b301-4bf4-8c88-8b040e81cf27',
  'stanciuandrei720@gmail.com',
  'pending',
  0
)
ON CONFLICT DO NOTHING;
```

### 3. Snapshot partner totals BEFORE
```sql
SELECT pending_payout, total_earned
FROM public.partner_profiles
WHERE id='acfa6356-1de5-49b9-9fb2-aac5ba17e93c';
```

### 4. Fire the webhook
```bash
./scripts/test-fanbasis-webhook.sh \
  payment.succeeded \
  f8895dbd-274b-4714-bfc4-0e98cea060a4 \
  8461d2e4-b301-4bf4-8c88-8b040e81cf27 \
  growth
```

### 5. Verify
```sql
-- Referral flipped to converted with plan + value?
SELECT status, plan, monthly_value, converted_at
FROM public.partner_referrals
WHERE referred_user_id='8461d2e4-b301-4bf4-8c88-8b040e81cf27';
-- Expect: status='converted', plan='growth', monthly_value=189

-- Commission row inserted?
SELECT amount, status, type, period_month
FROM public.partner_earnings
WHERE referral_id IN (
  SELECT id FROM public.partner_referrals
  WHERE referred_user_id='8461d2e4-b301-4bf4-8c88-8b040e81cf27'
);
-- Expect: amount=47.25 (189 * 0.25), status='pending', type='commission'

-- Partner totals bumped?
SELECT pending_payout, total_earned
FROM public.partner_profiles
WHERE id='acfa6356-1de5-49b9-9fb2-aac5ba17e93c';
-- Expect: both up by 47.25 vs the snapshot
```

## Other events to test

```bash
# Cancellation (sets subscriptions.status = cancelled)
./scripts/test-fanbasis-webhook.sh subscription.canceled <team> <user>

# Failed payment (only stamps notes, no plan change)
./scripts/test-fanbasis-webhook.sh payment.failed <team> <user>

# Renewal (re-extends expires_at, no new partner commission)
./scripts/test-fanbasis-webhook.sh subscription.renewed <team> <user>
```

## Target production instead of localhost

```bash
URL=https://tappr.me ./scripts/test-fanbasis-webhook.sh \
  payment.succeeded \
  f8895dbd-274b-4714-bfc4-0e98cea060a4 \
  8461d2e4-b301-4bf4-8c88-8b040e81cf27 \
  growth
```

## Cleanup after testing

```sql
-- Remove the test subscription + commission + referral
DELETE FROM public.partner_earnings
WHERE referral_id IN (
  SELECT id FROM public.partner_referrals
  WHERE referred_user_id='8461d2e4-b301-4bf4-8c88-8b040e81cf27'
);
DELETE FROM public.partner_referrals
WHERE referred_user_id='8461d2e4-b301-4bf4-8c88-8b040e81cf27';
DELETE FROM public.subscriptions
WHERE team_id='f8895dbd-274b-4714-bfc4-0e98cea060a4'
  AND notes LIKE '%payment.succeeded%';

-- Reset partner totals (if you bumped them)
UPDATE public.partner_profiles
SET pending_payout=0, total_earned=0
WHERE id='acfa6356-1de5-49b9-9fb2-aac5ba17e93c';
```
