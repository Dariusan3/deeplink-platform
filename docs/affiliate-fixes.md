# Affiliate Program — Fixes & FIFO Pyramid

**Date:** 2026-03-31

---

## Issues Fixed

### 1. Referrals Always Empty (Critical Bug)

**Root cause:** The signup page completely ignored the `?ref=` query parameter. When a user clicked an affiliate link like `/signup?ref=ABC123` and signed up, no referral record was ever created.

**Flow before fix:**
```
Affiliate shares link → User clicks → Signs up → Nothing happens → Referrals stay empty
```

**Flow after fix:**
```
Affiliate shares link → User clicks → Signs up →
  Email signup: ref code stored in user_metadata.referral_code
  Google OAuth: ref code stored in localStorage
→ Auth callback reads ref code → Creates affiliate_referrals record (status: pending)
→ Affiliate sees new pending referral immediately (via Supabase Realtime)
```

**Files changed:**
- `src/app/(auth)/signup/page.tsx` — reads `?ref=` param, stores in Supabase user metadata + localStorage for Google OAuth
- `src/app/auth/callback/route.ts` — processes referral code after email verification, creates `affiliate_referrals` record using service role key

### 2. FIFO Pyramid Leaderboard (New Feature)

**Concept:** Top 5 affiliate positions displayed as a visual pyramid. First 5 affiliates to join get spots 1-5. When position #1 rotates out, they go to position #5 and everyone shifts up (2→1, 3→2, 4→3, 5→4).

**Database changes:**
- Migration `007_affiliate_pyramid.sql` — adds `pyramid_position` (INT) and `pyramid_joined_at` (TIMESTAMPTZ) to `affiliates` table

**Hook additions (`use-affiliate.ts`):**
- `pyramidLeaders` — top 5 affiliates with their user info, ordered by position
- `joinPyramid()` — assigns next available position (1-5), errors if full
- `rotatePyramid()` — moves #1 to #5, shifts everyone else up by 1

**UI (`affiliate/page.tsx`):**
- Visual pyramid with decreasing widths (#1 = full width, #5 = 60% width)
- Position badges with gradient colors (gold #1, silver #2, bronze #3, etc.)
- Current user highlighted in green with "(You)" label
- Empty spots shown as dashed placeholders
- "Join Pyramid" button when spots are available
- FIFO explanation text at bottom

---

## Files Created/Modified

| Action | File |
|---|---|
| MODIFIED | `src/app/(auth)/signup/page.tsx` — captures `?ref=` param |
| MODIFIED | `src/app/auth/callback/route.ts` — processes referral on auth |
| CREATED | `supabase/migrations/007_affiliate_pyramid.sql` — pyramid columns |
| MODIFIED | `src/types/database.ts` — added pyramid fields to affiliates |
| MODIFIED | `src/hooks/use-affiliate.ts` — pyramid logic (fetch, join, rotate) |
| MODIFIED | `src/app/(dashboard)/dashboard/affiliate/page.tsx` — pyramid UI |

---

## Referral Lifecycle

| Stage | Status | Trigger |
|---|---|---|
| User signs up via ref link | `pending` | Auth callback |
| User subscribes to paid plan | `active` | (needs payment integration) |
| User cancels subscription | `churned` | (needs webhook) |

Note: The `pending → active` transition requires payment/subscription integration (Stripe webhook or similar) which is not yet implemented.
