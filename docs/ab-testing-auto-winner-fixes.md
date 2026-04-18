# A/B Testing Auto-Winner Fixes

Four bugs in the auto-optimization flow — all fixed in a single helper at [src/lib/ab-testing.ts](../src/lib/ab-testing.ts).

## Bugs

### 1. Zero-conversion edge case
**Before:** [src/app/[slug]/route.ts:221](../src/app/[slug]/route.ts#L221) gated the winner check on `rateA > 0 && rateB > 0`. If variant B had zero conversions, variant A could never be picked even with a dominant lead.
**After:** `pickWinner()` drops the both-nonzero guard. The multiplicative compare `rateA > rateB * (1 + threshold)` still behaves correctly when rateB is 0 (any positive rateA wins the compare).

### 2. `min_conversions` semantics
**Before:** Gate was `totalConversions = a + b >= min_conversions` — the sum across both variants.
**After:** Gate is `a >= min_conversions OR b >= min_conversions` — "whichever variant reaches the conversion threshold first wins", matching the product rule.

### 3. No winner notification
**Before:** The winner was silently written to the DB. The user had no signal that the test completed and no easy way to see which URL to put on their CTA.
**After:** [src/lib/email.ts](../src/lib/email.ts) exports `sendABWinnerEmail`. `finalizeABWinnerIfReady()` calls it for every team owner with the winning variant name, URL, stats, computed lift, and the `tappr.me/<slug>` wrapper URL to drop on the CTA button.

### 4. Winner check only ran on a visit
**Before:** The auto-winner block lived inside the redirect handler, so if traffic dropped to 0 after the threshold was met, the winner was never finalized.
**After:** The existing daily cron at [src/app/api/cron/anomaly-check/route.ts](../src/app/api/cron/anomaly-check/route.ts) now also iterates every `status='running' AND auto_optimize=true AND winner IS NULL` test and calls `finalizeABWinnerIfReady`. No new cron added (Vercel Hobby caps us to 1 daily cron).

## Race safety

`finalizeABWinnerIfReady` performs a conditional UPDATE with `.is("winner", null)` — if two concurrent requests (or a request + the cron) both decide to pick a winner, only the first UPDATE succeeds; the second sees no rows returned and skips the email. The visits + conversions counters are already atomic via `increment_ab_visit` / `increment_ab_conversion` RPCs.

## Files touched
- [src/lib/ab-testing.ts](../src/lib/ab-testing.ts) — new: `pickWinner`, `finalizeABWinnerIfReady`, `notifyABWinner`.
- [src/lib/email.ts](../src/lib/email.ts) — added `sendABWinnerEmail`.
- [src/app/[slug]/route.ts](../src/app/[slug]/route.ts) — replaced inline block with a call to the helper; added a service-role Supabase client for the RLS-restricted lookups.
- [src/app/api/cron/anomaly-check/route.ts](../src/app/api/cron/anomaly-check/route.ts) — iterates running auto-optimize tests after the anomaly sweep.
