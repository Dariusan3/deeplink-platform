# Analytics page — UI/UX polish

UX pass over the Deep Analytics page (`src/app/(dashboard)/dashboard/analytics/page.tsx`
and `src/components/analytics/*`) to make it easier to scan as a user.

## Data & refresh — verified, no changes needed
Cross-checked the `dashboard_analytics` RPC against independent raw
aggregations on the live DB: total / hourly-sum / device-sum / daily-sum all
reconcile (4989 = 4989), top geo matches (RO/2825), per-link filter matches
(1056), timezone doesn't change totals, bogus collection → 0. Refresh works:
`use-analytics` refetches on every mount and filter change (stale-while-
revalidate cache), and the toolbar refresh button does a full reload.

Latent note (not a live bug): the RPC ANDs `p_link_id` and `p_collection_id`
even though its comment says link "wins". The client never sends both
(`use-analytics.ts` nulls the collection when a link is selected), so app
behavior is correct.

## Changes applied

1. **Moved the AI Weekly Intelligence Report up** — from the very bottom of the
   page to right under the top stats row, so headline insights are visible
   without scrolling.

2. **Fixed duplicated number on the Clicks stat card** — it showed the total
   twice (`4,989` then `4,989 total`). The subtitle now reflects the selected
   window: `in last 30 days` / `all time` / `selected range`, driven by a
   `rangeLabel` derived from `timeRange`.

3. **Unified card titles across all breakdown cards** — Geo, Device, Top Links,
   and Traffic Sources used a small grey uppercase label
   (`text-[10px] uppercase tracking-[0.2em] text-neutral-500`) while Browsers,
   Peak Hours, and Links Created used a larger white title with a colored icon.
   Adjacent cards (e.g. Browsers vs Traffic Sources) looked mismatched. All now
   use the same style: `text-sm font-black` + a colored `w-4 h-4` icon. The only
   intentionally larger title is `Clicks Over Time` (the full-width hero chart).

## Not applied (offered, declined for now)
Section labels (OVERVIEW / TRAFFIC / AUDIENCE / TIMING) to chunk the long page
into scannable zones — can be added later if desired.

## Related
See `docs/analytics-empty-bar-charts-fix.md` for the earlier fix where Peak
Hours and Links Created rendered blank (missing `h-full` on percentage-height
bar wrappers).
