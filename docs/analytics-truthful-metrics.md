# Analytics page: stored XSS, lying labels, and layout order

Four issues found while reviewing whether the analytics page's elements were
well placed. Only the last two were about placement.

## 1. Stored XSS in the AI Weekly Report — fixed first

`src/components/analytics/weekly-report.tsx` wrote the language model's output
straight into the DOM:

```jsx
dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }}
```

`renderMarkdown` did nothing but run markdown regexes — no escaping.

The prompt that produces that text embeds user-controlled strings. In
`src/app/api/ai/weekly-report/route.ts` the whole `analyticsData` object is
`JSON.stringify`'d into the prompt, and it carries `topLinks[].title` and
`topReferrers[].domain`.

**Attack:** create a link titled `<img src=x onerror=...>`. The model echoes it
into the narrative. It executes in the browser of every teammate who opens the
report. The same path allows prompt injection — a link title can instruct the
model.

**Fix:** `escapeHtml` runs before the markdown rules, so the only tags left in
the string are the ones the function itself adds.

Verified with 23 assertions over payloads including `<img onerror>`,
`<script>`, `<svg/onload>`, `"><iframe>`, `<a href=javascript:>`, and payloads
smuggled through markdown constructs (`- <img …>`, `## <script>`,
`</strong><script>`). Checks: no foreign tag survives, no `on*=` handler appears
inside a real tag, and bold / list / heading / `&` still render correctly.

## 2. "Current Period" vs "Previous Period" did not mean that

```js
const halfPoint = Math.floor(dailyClicks.length / 2);
previousPeriodClicks = dailyClicks.slice(0, halfPoint)
currentPeriodClicks  = dailyClicks.slice(halfPoint)
```

These are the two halves of the **selected window**. Select `30D` and "Previous
Period" is days 1–15 of those 30 — not the 30 days before them.

Now labelled `Last {n}d` / `Prior {n}d` from the real half lengths, with a line
under the card: *"Both halves of the selected range — not this range versus the
one before it."*

## 3. "Growing" / "Declining" measured neither

```js
growingLinks   = topLinks.filter(l => l.count > avgClicksPerDay)
decliningLinks = topLinks.filter(l => l.count > 0 && l.count < avgClicksPerDay)
```

`topLinks` comes from the RPC as one total per link for the window — it has no
time dimension at all. These are "above the mean" and "below the mean". A link
with perfectly flat traffic that never lost a click was reported as **Declining**
purely for sitting below the average.

Renamed to **Above Average** / **Below Average**, with the average stated under
the card. Computing real per-link growth would need a per-link daily series the
RPC does not return; that is a separate change.

## 4. Health Score was constant, and the chart was buried

The Health Score ring led the most prominent card. Its factors:

| Condition | Points |
|---|---|
| has an active link | 30 |
| has any clicks | 25 |
| trend ≥ 0 | 20 |
| more than one referrer | 15 |
| more than one country | 10 |

Any account with real traffic scores 100, or 90 when the trend is negative. It
never moves. Removed.

`ClicksChart` — the time series the page exists to show — rendered *fourth*,
below two cards of derived metrics. Moved up, directly under the stats row and
the (slim, collapsed) AI report.

Also removed: duplicate readouts. `avgClicksPerDay` and `trendPercent` appeared
both in the top "Avg / Day" stat card and again in a footer block inside Traffic
Trends. `daysWithClicks` was computed and never used.

## Page order now

1. Toolbar (range, collection, export)
2. Stats row — Clicks, Avg / Day, Top Referrer, Top Location
3. AI Weekly Report (collapsed, one row tall)
4. **Clicks Over Time**
5. Link Performance + Traffic Trends
6. Top Links · Geo · Device
7. Browsers · Referrers
8. Peak Hours · Links Created

## Verified

- 23/23 XSS assertions pass
- `npx tsc --noEmit` clean
- No dangling references to `healthScore`, `growingLinks`, `decliningLinks`,
  `daysWithClicks`, `currentPeriodClicks`, `previousPeriodClicks`
- Unused imports removed (`Heart`, `TrendingUp`, `TrendingDown`, `ArrowRight`)
- Dev server compiles clean; `/dashboard/analytics` returns 200 when authed

## Related
- `docs/analytics-ui-polish.md`
- `docs/analytics-empty-bar-charts-fix.md`
