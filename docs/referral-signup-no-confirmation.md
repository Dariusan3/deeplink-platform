# Referral signup without confirmation email

Requested: people arriving through a partner link create an account without the
"confirm your email" step.

## Why not just a setting
Supabase "Confirm email" is project-wide. Turning it off would also drop
confirmation for every non-referral signup. So it is bypassed only for
referral signups.

## How
- `POST /api/auth/referral-signup { email, password, full_name, code }`
  (`src/app/api/auth/referral-signup/route.ts`): validates the code with
  `resolvePartnerByCode`, then `auth.admin.createUser` with `email_confirm: true`
  and `referral_code` in user_metadata (so `handle_new_user` sets
  `signup_status = 'ok'`). Rate limited 5/min/IP. Duplicate email → 409 with a
  friendly message.
- `signup-form.tsx`: when a referral code is present, calls the route, then
  `signInWithPassword`, `claim-referral`, and goes to `/dashboard`. With no code
  the old `supabase.auth.signUp` + confirmation flow is unchanged.
- Google signup is untouched (Google already verifies the email).

## Trade-off
The address isn't proven to belong to the person signing up. Someone could
register another person's email with a referral link; that owner then can't
sign up with it. No session is ever issued without the password, so nothing is
exposed. The hCaptcha step in the referral funnel and the rate limit limit abuse.
