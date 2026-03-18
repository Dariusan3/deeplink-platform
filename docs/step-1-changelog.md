# Step 1: Live Stats + 14-Day Click Chart

## What was implemented
- Real-time dashboard stats replacing hardcoded placeholder values
- Stats cards now show: actual link count, total clicks, clicks today (+N today badge), active teams count, click rate per link
- 14-day click activity bar chart with hover tooltips, gradient bars, and grid lines

## Files created
- `src/hooks/use-click-stats.ts` — Hook that queries `link_clicks` for aggregate stats and 14-day daily breakdown
- `src/components/dashboard/click-chart.tsx` — Bar chart component with tooltips, responsive design, dark theme styling

## Files modified
- `src/app/(dashboard)/dashboard/page.tsx` — Replaced hardcoded stats with real data from `useClickStats`, replaced "Advanced Intelligence" placeholder with `ClickChart`

## How to test
1. Run `npm run dev` and navigate to `/dashboard`
2. Stats cards should show real link count and click totals
3. "Clicks" card shows "+N today" badge
4. Bar chart shows last 14 days of click activity
5. Hover over bars to see exact count and date
6. With no links, all values show 0 and chart shows empty bars
