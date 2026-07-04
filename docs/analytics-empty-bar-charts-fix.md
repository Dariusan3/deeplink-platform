# Fix: "Peak Traffic Hours" & "Links Created" charts render empty

## Symptom
On the Deep Analytics page, the **Peak Traffic Hours** and **Links Created**
cards showed no bars — the cards rendered with titles/labels but the chart area
was blank, even though clicks and links existed.

## Root cause
A CSS height-resolution bug in the two bar-chart components, not a data problem.

The bars set their height as a percentage:
```tsx
style={{ height: `${pct}%` }}
```
A percentage height only resolves when the **parent element has a definite
height**. The bar's parent is the per-column wrapper `<div>`. In both broken
components that wrapper was:
```tsx
className="flex-1 flex flex-col items-center gap-1 group relative"
```
The outer bars container uses `flex items-end` (align-items: flex-end), which
means `flex-1` children are **not** stretched vertically — they take their
content height (auto). With an auto-height parent, the bar's `height: X%`
resolves to `0`, so every bar collapsed and became invisible.

The working `ClicksChart` wrapper (reference) includes `h-full justify-end`:
```tsx
className="flex-1 flex flex-col items-center justify-end h-full relative"
```
`h-full` gives the wrapper the container's full (definite) height, so the
percentage bars resolve correctly.

## Data verification (ruled out backend)
Confirmed the pipeline was fine before touching CSS:
- `link_clicks`: 6158 total, 4993 in last 30 days.
- `links`: 6 created in the last 14 days.
- RPC `dashboard_analytics` returned a full 24-entry `hourly` array with real
  counts and 31 `daily` entries.

So the RPC (`supabase/migrations/020_dashboard_analytics_rpc.sql`) and the
`use-analytics` hook were correct; only the render was broken.

## Fix
Added `justify-end h-full` to the per-column wrapper in both components:

- `src/components/analytics/peak-hours.tsx` (the 24-hour bar wrapper)
- `src/components/analytics/links-created.tsx` (the 14-day bar wrapper)

```diff
- className="flex-1 flex flex-col items-center gap-1 group relative"
+ className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative"
```

## Takeaway
Any percentage-height bar inside a `flex items-end` container needs `h-full`
(and typically `justify-end`) on the column wrapper. Match the `ClicksChart`
pattern when adding new bar charts.
