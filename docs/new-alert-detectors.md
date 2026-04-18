# New Alert Detectors

Three high-signal, low-false-positive detectors added to [src/app/api/cron/anomaly-check/route.ts](../src/app/api/cron/anomaly-check/route.ts). All run inside the daily cron.

## 1. Paused Link Still Trafficked (severity: low)
A link marked `is_active = false` but still receiving clicks — usually because old posts or bookmarks point to it. Users reach a 404/paused page instead of the current destination.

- **Trigger:** ≥20 clicks in the last 24 hours on a paused link.
- **Why this threshold:** below 20 is normally stragglers from a dead campaign that isn't worth pinging about. Above 20/day is an actual leak.
- **Action prompt:** re-activate with a new destination, or add a redirect rule pointing to the replacement.

## 2. Traffic Concentration Risk (severity: medium)
A single referrer drives >70% of a link's traffic. If that source goes down (post deleted, platform blocks, algorithm shift), traffic vanishes.

- **Trigger:** among the team's top 5 links, any link with ≥100 clicks over 7 days where one referrer hostname accounts for >70%.
- **Noise controls:**
  - Minimum 100 clicks so we don't fire on tiny-volume links where a single source naturally dominates.
  - `"direct"` (clicks with no referer) is excluded — it's not a single-source dependency, just the catch-all for many sources.
  - Referrer hostnames are extracted and normalized (strip `www.`, lowercase) so `www.instagram.com` and `instagram.com` group together.

## 3. Goal Miss Risk (severity: medium)
Proactive: partway through a goal period but pace projects a miss by ≥30%. The user finds out before the period ends, not after.

- **Trigger:** a link with `click_goal` set, `>50%` of the goal period elapsed, and projected total (`actual / elapsed%`) is `<70%` of the goal.
- **Why 50% elapsed:** earlier than this, projection is too noisy. Every fresh period would false-positive in the first hour.
- **Action:** the alert includes the current tally, % elapsed, and the projected shortfall, so the user can decide whether to push more traffic or adjust the goal.

## Dedup change (applies to all detectors)
The dedup query previously keyed on `team + title` in the last 4 hours, which meant that if two different links each triggered "Goal Miss Risk", only the first got saved. Now the key also includes `affected_link`, so per-link alerts coexist. Alerts without an `affected_link` still dedup by null equality.

## Calibration notes
- Thresholds are fixed integers/percentages, not learned from each link's historical volatility. For links with very spiky traffic this could false-positive. Worth revisiting once we have a few weeks of production alert data.
- All three detectors share the existing AI enhancement (root cause + action) and the dedup window — no separate config.
