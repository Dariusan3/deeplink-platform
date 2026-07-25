# Alert emails — consolidation & deliverability fix

Date: 2026-07-25

## The complaints (from a real user)

1. "Nu-s trimise când trebuie" — not sent when they should be.
2. "Primesc mereu" — received every day / too often.
3. "Intră în spam" — land in spam.

## Root causes found

There were **two parallel alert systems**, both writing to `anomaly_alerts`:

| System | Cron | Emails? | Detection |
|---|---|---|---|
| Groq `anomaly-check` | 08:00 UTC daily | **yes** (high-severity) | 2h-vs-previous-2h window, sampled once/day |
| Detectors `tier1-alerts` | 09:00 UTC daily | **no** | proper 7d/30d baselines + smart dedup |

- **Not sent when they should:** the good detectors (broken destination, click
  drop/spam) ran in `tier1-alerts`, which sent **no email**. Only the Groq path
  emailed, and it only looked at a fixed 2-hour slice at 08:00 UTC — a drop at
  3pm was never seen.
- **Received every day:** the Groq path deduped on a **4-hour** window while the
  cron runs every **24h**, so any persistent condition (paused link still
  getting traffic, low-traffic night-hour false "drop") re-inserted and
  **re-emailed daily**.
- **Spam:** `[HIGH] … — Team` subject (bracket + CAPS), HTML-only (no text
  part), no `List-Unsubscribe` header, no reply-to.

Infra constraint: Vercel Hobby = **1 cron/day**, so near-real-time isn't
possible; detection has to be coherent with a daily cadence (it now is).

## What changed

Emails now come **only** from the detector system, which has real
per-condition dedup/cooldown.

- **`src/lib/alert-detectors.ts`** — `persistDetections()` now also returns
  `insertedAlerts` (the alerts actually inserted this run, i.e. genuinely new —
  it refuses to re-insert anything still open or inside its cooldown).
- **`src/app/api/cron/tier1-alerts/route.ts`** — after persisting, sends **one
  digest email per team** for freshly-inserted, email-worthy alerts only
  (Tier-1 types OR `severity = high`), capped at 8 per digest, gated by the
  `emailAlerts` plan flag (Starter+). Because it emails only *new* inserts, a
  lingering condition never re-emails → kills "primesc mereu".
- **`src/app/api/cron/anomaly-check/route.ts`** — the email block was **removed**.
  It still writes in-app anomalies and keeps its A/B-winner finalize + prune +
  partner-report piggybacks; it just never emails.
- **`src/lib/email.ts`** — new `sendAlertDigestEmail()` with deliverability
  best-practices: natural subject (no `[HIGH]` caps), **plain-text alternative**,
  `reply-to: support`, and a **`List-Unsubscribe`** header. (`sendAnomalyEmail`
  is now unused — left in place, superseded by the digest.)

Net effect: fewer emails, only the ones that matter, and only when the condition
is actually new.

## STILL REQUIRED — DNS (biggest spam lever, not in code)

Deliverability code fixes only go so far. The dominant factor is domain
authentication. In the **Resend dashboard** for `tappr.me`, verify:

- **SPF** record present.
- **DKIM** signing enabled (Resend gives CNAME/TXT records to add).
- **DMARC** policy (`_dmarc.tappr.me`, at least `p=none` to start).
- The `alerts@tappr.me` sender is on the verified domain.

Without DKIM/DMARC on the sending domain, Gmail/Yahoo will keep flagging these
regardless of headers.

## Possible follow-ups (not done)

- A true one-click unsubscribe endpoint + a per-team "email alerts" toggle in
  settings (currently opt-out is via the `List-Unsubscribe` mailto + turning the
  plan feature off). Needed if volume ever exceeds Gmail's bulk-sender threshold.
- Retire the Groq `anomaly-check` **detection** entirely (it still duplicates
  in-app alerts the detector system already produces better). Left in for now to
  avoid dropping its unique "paused link still trafficked" alert — port that to
  `alert-detectors.ts` first.
