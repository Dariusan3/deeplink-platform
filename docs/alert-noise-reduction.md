# Alerts — noise reduction

Date: 2026-07-04. Problem: the alerts section was flooded (~135 rows for a small
account), most of it repeats of the same conditions.

## Root cause
`persistDetections()` in `src/lib/alert-detectors.ts` inserted **every** detected
alert on **every** run. The `tier1-alerts` cron runs every 3 hours, and `dedup_key`
(which already encodes the calendar day for windowed alerts) was computed and stored
but **never checked before inserting**. So a condition that kept firing — stale links,
an ongoing click drop, a shifted peak hour — produced a fresh row ~8× per day.

Production distribution before the fix:

| alert_type | count |
|---|---|
| stale_links (low) | 32 |
| click_drop (high) | 25 |
| peak_hour_shift (low) | 23 |
| (null — from the AI `anomaly-check` cron) | 33 |
| device_shift / country_shift / others | ~22 |

## Fixes applied
1. **Dedup on insert** — `persistDetections` now builds a suppression set from alerts
   that are still open (undismissed) **or** fired within a 48h cooldown, and skips
   inserting a duplicate for the same `team_id:dedup_key`. It also adds each inserted
   key to the set so two detectors can't double-insert in one run. This collapses the
   intra-day repeats (the main flood) and gives each condition a sane re-alert cadence.
2. **Removed `peak_hour_shift`** from `runAllDetectors` — peak hour naturally flaps day
   to day, so it fired constantly with almost no actionable value (2nd-noisiest type).
   The detector function is kept for a possible stricter future version.

Both fixes cover the cron (`/api/cron/tier1-alerts`) and the manual "Check now"
(`/api/alerts/check`), since both call `persistDetections`.

## Still open (needs your call)
- **Existing backlog** (~135 rows) is unchanged by the code fix — can be cleaned up by
  dismissing `peak_hour_shift` rows + collapsing per-key duplicates.
- **`stale_links`** still fires up to once/day — could be made weekly (it's the same
  "you have N dormant links" message).
- **`device_shift` / `country_shift`** are low-value "your mix shifted" alerts.
- **Second alerting system:** the daily `anomaly-check` cron (AI-based) writes untyped
  alerts to the same table with no dedup — the 33 `null` rows. Worth unifying with the
  typed detectors so there's one deduped pipeline.

## Verification
- `tsc --noEmit` clean, `eslint` clean on the changed file.
