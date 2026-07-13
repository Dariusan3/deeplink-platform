# Alerts: cutting the junk

The alerts list filled up with rows that were either wrong, already fixed, or the
same news repeated. Six distinct causes, in rough order of how much noise each
one produced.

## 1. `destination_broken` alerted on statuses that don't mean "broken"

The probe was a single `HEAD` request with no user agent, and it alerted on any
status `>= 400`. A perfectly healthy page routinely answers:

| Status | What it usually means | Broken? |
|---|---|---|
| 401 / 403 | Origin blocks datacenter IPs or unknown user agents | No |
| 405 | Origin doesn't implement `HEAD` | No |
| 429 | We got rate-limited | No |
| 404 / 410 | Page is gone | **Yes** |
| 5xx | Origin is erroring | **Yes** |

So a link that opened fine in a browser got an alert saying it was dead.

Now: `isDecisivelyBroken()` gates on 404/410/5xx only, the probe sends a browser-ish
`user-agent`, and a failing `HEAD` is confirmed with a `GET` before we accuse the
destination. A network failure (timeout, DNS, TLS) returns `null` and produces
*nothing* — neither an alert nor a resolution. Guessing "broken" on a flaky run is
how one bad cron turns into a page full of alerts about links that were never down.

The hard `.limit(25)` on links is gone too (now 200, with a concurrency pool of 8).
A team with 40 links had 15 that were simply never checked — and an unchecked link
can't be auto-resolved either.

## 2. Alerts never closed themselves

Nothing auto-closed an alert whose condition had cleared unless the user had
*acknowledged* it first. Fix the link, and the alert sat there until you also
dismissed it by hand. The list only ever grew.

`persistDetections` now closes on its own:

- **`AUTO_CLOSE_ON_ABSENCE`** — `plan_limit`, `stale_links`, `country_shift`,
  `device_shift`, `subscription_expiring`. These describe a condition that is
  either true or false *right now*. A detector ran and didn't re-detect it → the
  condition cleared → close the row.
- **`destination_broken`** is deliberately *not* in that set. It closes only on a
  probe that came back positively healthy (`DetectorRun.resolved`). Absence could
  also mean the probe timed out, and closing a real outage because our network
  hiccuped is the worst failure mode in this file.
- **Events are never auto-closed by absence** — `goal_hit`, `ab_winner`,
  `traffic_spike`, `click_spam`, `click_drop`. They were true when they fired and
  stay true.

A detector that *throws* is not evidence its condition cleared, so `DetectorRun.ran`
tracks which detectors completed and auto-close skips the rest.

## 3. Dedup keys re-announced the same news daily

The key's time bucket **is** the alert's re-fire cadence. Several were wrong:

| Alert | Was | Now | Why |
|---|---|---|---|
| `click_drop` | `click_drop:{date}` | `click_drop:{link}:{week}` | The key ignored the link id the detector passed it — so on a day when three links dropped, **two were silently swallowed as duplicates of the first**. Weekly, because a link that stays down would otherwise file a fresh alert every morning. |
| `goal_hit` | `goal_hit:{link}:{date}` | `goal_hit:{link}:{period bucket}` | A **monthly** goal cleared on the 5th re-fired on the 6th, the 7th, and every day to the 30th. The clicks stayed past the goal; only the date changed. |
| `country_shift`, `device_shift`, `peak_hour_shift` | `{date}` | `{week}` | All three compare the last 7 days against the previous 23. That window barely moves overnight, so the same trend was re-announced ~7 times before it changed. |
| `plan_limit` | `plan_limit:{threshold}` | `plan_limit:{threshold}:{month}` | Crossing 80% again next cycle is news. Crossing it again tomorrow isn't. |

## 4. Thresholds that manufactured trends out of noise

- **`traffic_spike`** needed only a 5/hour average and a 3× ratio — on a quiet
  account that's *18 clicks instead of 6*, technically a spike, and it fired most
  days. Added an absolute floor: `MIN_CLICKS_LAST_HOUR = 25`. A spike has to be
  big in ratio **and** big in absolute terms.
- **`country_shift` / `device_shift`** ran on a 100-click sample, where one busy
  afternoon from one country moves the "top country". Raised to
  `MIN_TREND_SAMPLE = 250`.
- **`country_shift`** also fired when two countries traded #1 at 21% vs 20%. Now
  the old leader must have dropped ≥20 points **and** the new leader must actually
  hold ≥35% of traffic.

## 5. Low-severity alerts accumulated forever

Nobody is going to action "your peak hour moved" from three weeks ago. Open `low`
alerts older than `LOW_SEVERITY_TTL_MS` (21 days) are now expired automatically.

## 6. The cooldown suppressed genuine re-breaks

The old 7-day suppression window keyed off `created_at` for *any* prior row with
the same key. With `destination_broken`'s stable key, that meant: link breaks
Monday → alert. Link fixed Tuesday → alert closed. **Link breaks again Wednesday →
silently suppressed until the following Monday.**

The cooldown now distinguishes *how* the previous row ended. `re_verified_after_ack`
is set on every auto-close, marking rows the **system** closed because it re-checked
and the condition was gone. Those are exempt from the cooldown — the condition
demonstrably cleared, so its return is news. Rows the **user** dismissed by hand
still suppress for 7 days: if you dismissed a 404 and haven't fixed it, we don't
nag you again tomorrow.

## API surface

`runAllDetectors` now returns a `DetectorRun` (`{ alerts, resolved, ran }`) instead
of a bare `DetectedAlert[]`; `persistDetections` takes it and returns
`{ inserted, closed }`. Both callers updated
([cron](../src/app/api/cron/tier1-alerts/route.ts),
[check](../src/app/api/alerts/check/route.ts)). "Check now" surfaces both numbers —
a run that clears four rows and adds none used to report "nothing new" while the
list visibly shrank.

## Verified

`tsc --noEmit` clean, `eslint` clean, `npm run build` succeeds. Not exercised
against live data — the detectors only run from the cron or "Check now".
