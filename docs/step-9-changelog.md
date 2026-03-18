# Step 9: Free Tier Usage Banner

## What was implemented
- Usage banner showing "X of 500 free clicks used this month (resets in N days)"
- Color-coded progress bar: green (< 70%), amber (70-90%), red (90%+)
- "Upgrade Now" button placeholder
- Banner appears on all dashboard pages
- Auto-calculates days until month reset

## Files created
- `src/hooks/use-usage.ts` — Monthly click count query against free tier limit (500)
- `src/components/dashboard/usage-banner.tsx` — Banner with progress bar and upgrade CTA

## Files modified
- `src/app/(dashboard)/layout.tsx` — Added UsageBanner above page content

## How to test
1. Navigate to any dashboard page
2. Banner shows at the top with click usage count
3. Progress bar color changes based on usage percentage
4. Days until reset shows correctly
5. Banner hidden while loading
