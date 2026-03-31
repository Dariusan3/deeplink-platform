# ROI Calculator & A/B Test Conversion API — Fixes & Improvements

**Date:** 2026-03-31

---

## Issues Found

### 1. Race Condition in Conversion API (Critical)

**File:** `src/app/api/v1/ab-tests/route.ts`

**Problem:** The API used a read-then-write pattern to increment conversion counters:
```
SELECT current_count → compute new_count → UPDATE with new_count
```
Under concurrent requests (e.g., two conversions hitting the API at the same time), both would read the same count, both increment by 1, and both write the same value — losing one conversion.

**Fix:** Created a Postgres function `increment_ab_conversion` (migration `005_ab_test_atomic_increment.sql`) that atomically increments the counter in a single `UPDATE` statement:
```sql
UPDATE ab_tests SET variant_a_conversions = variant_a_conversions + 1 ...
```
The API now calls `supabase.rpc("increment_ab_conversion", ...)` instead of the read-then-write pattern.

---

### 2. ROI Calculator Disconnected from Real Data

**File:** `src/app/(dashboard)/dashboard/ab-testing/page.tsx`

**Problem:** The ROI Calculator only accepted manual input. It sat next to real A/B test data showing actual visits, conversions, and revenue — but couldn't use any of it. Users had to re-type numbers that were already on the page.

**Fix:** The `ROICalculator` component now:
- Accepts `tests: ABTest[]` as a prop
- Defaults to **"Live Data" mode** — auto-computes ROI, profit, CPC, CPA, and conversion rate from all A/B tests' actual visits, conversions, revenue, and cost_per_click
- Has a **"Manual" toggle** to switch back to manual input mode for hypothetical scenarios
- Shows read-only summary cards in live mode (Ad Spend, Clicks, Conversions, Revenue) pulled from real data

---

### 3. No Rate Limiting on Public Conversion API

**File:** `src/app/api/v1/ab-tests/route.ts`

**Problem:** The POST endpoint is intentionally public (no auth) so external pages can track conversions. But there was no rate limiting — anyone could spam it to inflate conversion numbers or abuse the service.

**Fix:** Added an in-memory rate limiter:
- **30 requests per IP per minute** window
- Returns `429 Too Many Requests` with `Retry-After: 60` header when exceeded
- Stale entries auto-cleaned every 60 seconds to prevent memory leak
- Also added: test status check (rejects conversions for non-running tests), revenue sanitization (`Math.max(0, ...)`)

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/005_ab_test_atomic_increment.sql` | New: atomic increment Postgres function |
| `src/app/api/v1/ab-tests/route.ts` | Rewritten: atomic RPC, rate limiting, input validation |
| `src/app/(dashboard)/dashboard/ab-testing/page.tsx` | Updated: ROI calculator connected to real A/B test data |

## Migration

Run migration `005_ab_test_atomic_increment` on Supabase (already applied to production).
