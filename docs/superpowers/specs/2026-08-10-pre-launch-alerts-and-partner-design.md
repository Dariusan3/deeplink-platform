# Pre-launch: link health, alert hygiene, partner responsiveness

Date: 2026-08-10
Status: approved design, not yet implemented

Three independent workstreams, agreed in one brainstorming session because they
were raised together as pre-launch blockers. They share no code and can be built
in any order, but B depends on A for one detail (the `destination_broken` dedup
key reads `link_health.down_since`), so if both are built, A lands first.

There is no test framework in this repository — `package.json` exposes only
`dev`, `build`, `start`, `lint`, and there are no `*.test.*` files. Verification
for every part below is `npm run build`, `npm run lint`, and the manual checks
each section names. Any claim of "working" has to cite one of those.

---

## Part A — Link health measured at click time

### Problem

Nothing in the product knows whether a redirect actually worked.

`/[slug]/route.ts` issues a 302 and forgets. The only destination check is
`detectDestinationBroken`, run by a cron twice a day, which probes every active
link from the server. So a destination that breaks at 10:00 is reported at 09:00
the next morning, and a destination that breaks and recovers between two cron
runs is never reported at all — the alert row is auto-closed on the next healthy
probe and no trace remains.

### Decisions taken

- The signal comes from **real clicks**, not from a schedule.
- Probes are **throttled to one per link per 5 minutes**, so click volume does
  not translate into probe volume.
- The user sees **the failure, the recovery, and a health badge** on the link.
- Threshold: **404/410 alert on the first failure; 5xx and timeouts need two
  consecutive failures.** A 5xx is very often a three-second hiccup at the
  origin, and alerting on the first one is how a real alert becomes noise.

### Data model

Migration `026_link_health.sql`:

```sql
create table public.link_health (
  link_id              uuid primary key references public.links(id) on delete cascade,
  team_id              uuid not null references public.teams(id) on delete cascade,
  last_status          int,          -- last observed HTTP status; null = inconclusive
  consecutive_failures int  not null default 0,
  last_checked_at      timestamptz,
  down_since           timestamptz,  -- start of the CURRENT outage episode; null = up
  healthy_since        timestamptz,  -- first healthy probe since the last failure
  last_recovery_at     timestamptz,
  updated_at           timestamptz not null default now()
);

create index idx_link_health_team on public.link_health(team_id);

alter table public.link_health enable row level security;

create policy "link_health_select" on public.link_health for select
  using (public.is_team_member(team_id, auth.uid()));
-- No insert/update/delete policy: writes are service-role only.
```

One row per link. Deliberately **no per-probe event log** — at click volume that
table would outgrow `link_clicks`. The long-term record is the alert rows in
`anomaly_alerts`, which already persist.

Deliberately **no `affected_clicks` column**. An earlier draft incremented a
counter on every click during an outage, which is a database write per click.
The same number is one `count(*)` over `link_clicks` filtered by
`clicked_at >= down_since`, computed once at recovery. Cheaper and exact.

`is_healthy` is not stored: it is `down_since is null and last_checked_at is not null`.
A stored copy is a second source of truth that can drift from `down_since`.

### The state machine

All transitions happen inside one plpgsql function so two concurrent probes
cannot interleave into an inconsistent state:

```sql
create function public.record_link_probe(
  p_link_id uuid, p_team_id uuid, p_status int
) returns table (event text, episode_start timestamptz, recovered_at timestamptz)
```

`event` is one of `none`, `went_down`, `still_down`, `recovered`.

- **`p_status is null`** (timeout, DNS, TLS — inconclusive): update
  `last_checked_at` and nothing else. Return `none`. An inconclusive probe is
  not evidence in either direction; this is the same rule the existing cron
  detector already follows, and the comment at
  `src/lib/alert-detectors.ts:78` explains why.
- **decisively broken** (`404`, `410`, or `>= 500`): increment
  `consecutive_failures`, clear `healthy_since`. The threshold is met
  immediately for 404/410, and at `consecutive_failures >= 2` for 5xx. When the
  threshold is met and `down_since is null`, set `down_since = now()` and return
  `went_down`; if `down_since` was already set, return `still_down`.
- **healthy** (anything else — note 403 counts as healthy, because some origins
  403 any non-browser user agent, see `PROBE_UA` at
  `src/lib/alert-detectors.ts:65`): reset `consecutive_failures` to 0, set
  `healthy_since` if null. If `down_since` is set **and** `healthy_since` is at
  least 30 minutes old, close the episode: return `recovered` with
  `episode_start = down_since`, then null out `down_since`. Otherwise return
  `none`.

That 30-minute rule is the flap guard. A destination that returns 502 at 14:00
and 502 again at 14:20 is one outage, not two, and produces one alert.

### The click path

In `src/app/[slug]/route.ts`, after `finalDestination` is computed and before
the response is returned:

```ts
after(() => recordLinkHealth(link.id, link.team_id, finalDestination));
```

`after()` from `next/server` (Next 16.1.6 is installed) runs after the response
has been sent. Redirect latency is unchanged — this is the whole reason the
check is not done inline.

`src/lib/link-health.ts` holds `recordLinkHealth`, which:

1. Gates on a 5-minute `unstable_cache` entry keyed `["link-probe", linkId]`,
   tagged `link-health:<id>` — the same pattern as `isTeamOverClickCap` in
   `src/lib/click-quota.ts:74`. The cache is the fast path; the authority is
   `link_health.last_checked_at`, re-checked inside, so a cache miss on a cold
   serverless instance cannot cause a probe storm.
2. Runs the existing HEAD→GET probe.
3. Calls `record_link_probe` with the service-role client.
4. Acts on the returned event (below).

Fails open at every step. A failed probe, a missing row, a database error — none
of them may affect the redirect, which has already been sent anyway.

**The probe helpers move.** `probe`, `checkDestination` and `isDecisivelyBroken`
move from `src/lib/alert-detectors.ts` into `src/lib/link-health.ts`, and the
cron detector imports them from there. One definition of "broken" for both entry
points; otherwise the click path and the cron path can disagree about the same
URL.

### Where the alerts come from

On `went_down` and on `recovered`, `recordLinkHealth` files the alert itself by
calling the existing `persistDetections` with a single-element run. It does not
wait for the cron.

This is the right call because `persistDetections` is where suppression,
cooldown and auto-close live (`src/lib/alert-detectors.ts:795`). Duplicating
that logic on the click path would guarantee the two drift apart.

- `went_down` → one `destination_broken` alert, with
  `ran: ["<teamId>:destination_broken"]` and `resolved: []`.
- `recovered` → one `destination_recovered` alert, with
  `ran: ["<teamId>:destination_broken", "<teamId>:destination_recovered"]` and
  `resolved: ["<teamId>:destination_broken:<linkId>:<episodeStart>"]`, so the
  open failure row closes in the same call. Affected clicks are counted here
  with a single `count(*)` over `link_clicks` since `episode_start`.

The exact shape of those two strings matters. `persistDetections` gates
auto-close on `ranTypes.has(\`${row.team_id}:${type}\`)` and matches resolution
against `\`${row.team_id}:${row.dedup_key}\`` — and after B2 the
`destination_broken` dedup key is `destination_broken:${linkId}:${downSince}`.
Get either string wrong and the failure row silently stays open forever.

`destination_recovered` is the second new alert type introduced by this part:

| Type | Tier | Severity | Dedup key | Emailed |
|---|---|---|---|---|
| `destination_recovered` | 4 | low | `destination_recovered:${linkId}:${downSince}` | no |

Tier 4 (Operational) rather than Tier 1: a link coming back is not "you are
losing money right now". Keying on the episode start means exactly one recovery
notice per outage, ever.

**Emails are not sent from this path.** The alert appears in-app within five
minutes; the email goes out with the next daily digest at 09:00 UTC. That is
intentional: instant email on every outage transition is exactly the "prea dese"
failure Part B exists to fix.

### UI

- Link list: a small status dot per link driven by `down_since is null`. Grey
  when `last_checked_at is null` — never checked is not the same as healthy, and
  showing green there would be a lie.

  The dot renders in `LinkCard`, not in `link-list.tsx` — the list is only a
  container (`src/components/links/link-list.tsx:222`). Getting the data there
  means joining `link_health` into the links query in the dashboard layout's
  server fetch (`src/app/(dashboard)/layout.tsx`), alongside the existing
  `team_link_click_counts` RPC, and widening the `Link` type. A separate
  client-side fetch would reintroduce exactly the provider waterfall that server
  fetch was written to remove.
- Alerts page: `destination_recovered` gets entries in `CATEGORY_STYLES` and
  `ALERT_ICONS`.

### Manual verification

1. Point a link at a URL returning 404. Click it. Within 5 minutes an alert
   exists and the link list dot is red.
2. Repoint the link at a working URL. Click it. No recovery alert yet.
3. Wait 30 minutes, click again. Recovery alert appears, failure alert closes,
   dot turns green.
4. Point a link at a URL returning 502. One click produces no alert. A second
   click after the throttle window does.

---

## Part B — Alert hygiene

### Problem

Four separate causes, three of which put mail in the inbox.

**B1 — `click_spam` re-fires daily.** Its dedup key buckets by day
(`src/lib/alerts.ts:94`), it is Tier 1 with severity `high`, and the email
filter admits both. A bot hammering a link for a week produces seven identical
emails telling the user to "consider geo-blocking". It is also absent from
`AUTO_CLOSE_ON_ABSENCE`, so seven rows pile up in the list and stay until
dismissed by hand.

**B2 — `destination_broken` re-fires on flapping.** The key carries no time
bucket (`src/lib/alerts.ts:87`), and rows the system auto-closed are excluded
from the dismissal cooldown on purpose (`src/lib/alert-detectors.ts:855`). A
destination that is down in the morning and up in the evening emails every day.
Part A makes this strictly worse if left alone — probing every 5 minutes instead
of once a day means far more open/close cycles.

**B3 — There is no way to opt out.** The `List-Unsubscribe` header points at
`mailto:...?subject=unsubscribe alerts` (`src/lib/email.ts:93`), processed by a
human, honoured by no code. `team_settings` has no notification column at all.
Gmail and Yahoo have required a working one-click unsubscribe from bulk senders
since February 2024, so this is a deliverability risk as well as a GDPR one.

**B4 — Two alert systems write to the same table.** `cron/anomaly-check` inserts
rows with `alert_type = NULL` and `dedup_key = NULL`
(`src/app/api/cron/anomaly-check/route.ts:361`), enriched with `root_cause` and
`action` generated by `llama-3.1-8b-instant`
(`src/app/api/cron/anomaly-check/route.ts:313`) — an 8B model inventing a cause
for a traffic drop whose data it never sees. That is the source of the
nonsensical copy. Because those rows have no `dedup_key`, `persistDetections`
skips them during auto-close (`if (!type || !row.dedup_key) continue`), so they
never close themselves. Two of the five detectors also duplicate typed ones:
"Traffic Drop Detected" ≈ `click_drop`, "Link Gone Silent" ≈ `click_drop`.

These rows never emailed — the comment at line 379 confirms it — so B4 is
in-app noise only.

### Decisions taken

Fix all four. Port the three genuinely unique anomaly detectors into the typed
system, delete the two duplicates and the AI enrichment. Opt-out is
**on / weekly / off** plus a working one-click unsubscribe.

### B1 — `click_spam`

`dedupKey`: `click_spam:${ip}:${today}` → `click_spam:${ip}:${week}`, reusing the
existing `isoWeekStart` helper. Add `click_spam` to `AUTO_CLOSE_ON_ABSENCE`.

The type is currently classified as an event ("a burst happened") rather than a
condition. In practice a scraper is a condition: it persists, and once it stops
there is nothing left to action. Weekly bucketing plus auto-close takes it from
seven emails and seven rows a week to one of each, and the row disappears on its
own when the burst ends.

### B2 — `destination_broken`

`dedupKey`: `destination_broken:${id}` → `destination_broken:${id}:${downSince}`,
where `downSince` is the ISO timestamp from `link_health`. The key now names the
outage episode rather than the link, so:

- the same outage seen on many runs is one alert,
- a genuinely new outage is a genuinely new alert,
- the 30-minute stability rule from Part A decides where one episode ends.

`dedupKey` gains a `downSince?: string` argument. The cron detector reads
`link_health` for the links it probes so both entry points build the same key.

### B3 — Opt-out and one-click unsubscribe

Migration `027_alert_email_prefs.sql`:

```sql
alter table public.team_settings
  add column if not exists alert_email_frequency text not null default 'daily'
    check (alert_email_frequency in ('daily','weekly','off')),
  add column if not exists alert_email_last_sent_at timestamptz,
  add column if not exists alert_email_unsub_token uuid not null default gen_random_uuid();

create unique index if not exists uq_team_settings_unsub_token
  on public.team_settings(alert_email_unsub_token);
```

A team with no `team_settings` row reads as `daily`. That preserves today's
behaviour rather than silently muting teams that never opened Settings.

New route `src/app/api/unsubscribe/alerts/route.ts`, handling both `GET` and
`POST` on `?token=<uuid>`:

- `POST` is what Gmail calls for one-click. It sets `alert_email_frequency = 'off'`
  and returns 200 with a plain body. No auth, no confirmation step — that is the
  specification, and a confirmation page would break the one-click contract.
- `GET` does the same and renders a short confirmation page for a human who
  clicked the footer link.

The token is a bare UUID. That is safe here because the only thing it can do is
turn emails **off**, never on, and it is scoped to one team. Nothing is
disclosed by knowing it.

Header change in `src/lib/email.ts`:

```
List-Unsubscribe: <https://tappr.me/api/unsubscribe/alerts?token=…>, <mailto:…>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

`sendAlertDigestEmail` takes a new `unsubToken` parameter, and the footer link
at `src/lib/email.ts:197` points at the same URL instead of the mailto.

Settings gets a three-way control. Note that `src/app/(dashboard)/dashboard/settings/page.tsx`
currently has no notification section at all — one has to be added.

### B3b — The digest is built from the database, not from the run

`src/app/api/cron/tier1-alerts/route.ts` currently digests `insertedAlerts`,
i.e. only the alerts that this particular cron run inserted. That breaks in two
ways once the rest of this spec lands: a weekly subscriber would receive only
the last day's news, and an outage filed instantly by Part A's click path would
never be emailed at all, because the cron did not insert it.

So the digest is instead assembled by querying `anomaly_alerts` for each team:
`is_dismissed = false`, `alert_type in EMAIL_TYPES`, and
`created_at >= coalesce(alert_email_last_sent_at, now() - interval '24 hours')`.
Daily and weekly then share one code path, and `alert_email_last_sent_at` is
written after a successful send.

Weekly teams are skipped unless `alert_email_last_sent_at` is more than 7 days
old, or null.

### B3c — The email filter becomes an explicit list

`EMAIL_WORTHY = tier === 1 || severity === "high"`
(`src/app/api/cron/tier1-alerts/route.ts:11`) is replaced by
`EMAIL_TYPES: ReadonlySet<AlertType>` exported from `src/lib/alerts.ts`.

The heuristic means any new alert type marked `high` starts emailing without
anyone deciding it should — which is exactly what would have happened to
`destination_recovered` from Part A.

Initial set, chosen to match what is sent today:
`destination_broken`, `click_drop`, `click_spam`, `plan_limit`,
`subscription_expiring`.

### B4 — Retire the parallel system

Ported into `src/lib/alert-detectors.ts` as typed detectors, keeping their
existing thresholds:

| New type | Tier | Severity | Dedup key | Condition |
|---|---|---|---|---|
| `paused_link_traffic` | 3 | low | `paused_link_traffic:${linkId}:${week}` | paused link, ≥20 clicks in 24h |
| `traffic_concentration` | 3 | medium | `traffic_concentration:${linkId}:${week}` | one referrer >70% of clicks, ≥100 clicks over 7d, `direct` excluded |
| `goal_miss_risk` | 2 | medium | `goal_miss_risk:${linkId}:${periodBucket}` | >50% of the goal period elapsed, projected total < 70% of goal |

`paused_link_traffic` and `traffic_concentration` join `AUTO_CLOSE_ON_ABSENCE` —
both describe a condition that is either true or false right now.
`goal_miss_risk` does not: it is a point-in-time warning about a period, and its
key already buckets by that period.

All three are Tier 2/3, so they sit behind the existing anomaly entitlement
(`anomalyLevel === "all"`, `src/lib/alert-detectors.ts:742`) like every other
non-Tier-1 detector. None is in `EMAIL_TYPES`.

Deleted from `src/app/api/cron/anomaly-check/route.ts`: the 2-hour traffic
spike/drop block, the "Link Gone Silent" block, the entire Groq enrichment
block, and the insert into `anomaly_alerts`. The route keeps its piggybacked
jobs — A/B winner finalization, subscription expiry, partner monthly reports,
GDPR click-log pruning — which is why it is not deleted outright.

The `groq-sdk` dependency stays: it is still used by `api/ai/chat`,
`api/ai/weekly-report`, `api/ai/anomaly-check` and `lib/ai-tools.ts`.
`api/ai/anomaly-check` is a separate on-demand route that never writes to
`anomaly_alerts`, and is out of scope.

Legacy rows are retired in the same migration:

```sql
update public.anomaly_alerts
   set is_dismissed = true, re_verified_after_ack = true
 where alert_type is null and is_dismissed = false;
```

`re_verified_after_ack = true` marks them system-closed, which keeps them out of
the dismissal cooldown — consistent with how `persistDetections` treats every
other auto-closed row.

### Type-safety note

`AlertType` is consumed by five `Record<AlertType, …>` maps: `ALERT_TIERS`,
`ALERT_LABELS` (`src/lib/alerts.ts`), `ALERT_ICONS`
(`src/lib/alert-icons.ts`), `FALLBACK_CODE` (`src/lib/alert-display.ts:26`), and
the `dedupKey` switch. Adding a type without updating all five fails the build.
With no test suite, that exhaustiveness is the main safety net across both A and
B, and it is worth keeping every one of those maps total rather than adding a
default branch.

Across the whole spec, `AlertType` gains four members:
`destination_recovered` (Part A), and `paused_link_traffic`,
`traffic_concentration`, `goal_miss_risk` (Part B4). None of them is added to
`EMAIL_TYPES`.

### Manual verification

1. Set a team to `weekly`, run the cron twice on consecutive days — one email.
2. `POST` to the unsubscribe URL with a valid token, confirm
   `alert_email_frequency = 'off'` and that the next cron sends nothing.
3. `POST` with an invalid token — 404, no write.
4. Confirm no row in `anomaly_alerts` has `alert_type is null` after the
   migration, and that a fresh cron run inserts none.

---

## Part C — Partner surface sizing

### Problem

**C1 — Broken on phones.** `src/app/partner/layout.tsx:12` is
`flex h-screen overflow-hidden`. On iOS Safari and Chrome for Android, `100vh`
is the *large* viewport, which ignores the browser chrome; combined with
`overflow-hidden` on the same element, the bottom 60–100px of the shell sits
under the toolbar and cannot be scrolled to. The `pb-20` on each page masks part
of it without fixing the cause. `PartnerSidebar` repeats `h-screen`
(`src/components/partner/partner-sidebar.tsx:76`), and in the mobile drawer that
sidebar sits inside an `inset-y-0` parent that already sizes it — two competing
height constraints.

**C2 — No width ceiling.** No `max-w-*` anywhere under `src/app/partner`; they
were removed deliberately in `df31b35` nine days ago. On a 2560px display minus
the 256px sidebar, 2304px of content remain, so the `grid-cols-2 md:grid-cols-4`
stat cards become ~560px each around a single number and a 10px label, and prose
on Promo and Settings runs far past a readable line length.

**C3 — 73 hardcoded font sizes.** 60 occurrences of `text-[8px]`–`text-[10px]`
plus 13 of `text-[11px]`–`text-[14px]`, spread across the six partner pages and
the five partner components. They are fixed pixels: they do not scale with
viewport, and they ignore the user's browser font-size setting entirely, which
is an accessibility failure rather than a matter of taste. The worst offenders
are the seven `text-[9px]` column headers in the referrals table and the
`text-[8px]` status pills (`src/app/partner/referrals/page.tsx:138`, `:164`).

**C4 — Two grids with no breakpoint.** `src/app/partner/link/page.tsx:70` forces
`grid-cols-3` down to 320px, giving three ~90px columns labelled "Total Clicks
(14d)" at 9px. And the referrals table puts seven columns inside an
`overflow-x-auto` with no scroll affordance and no mobile alternative
(`src/app/partner/referrals/page.tsx:118`).

### Decisions taken

- **Width:** a generous container, `mx-auto w-full max-w-[1600px]`, on each
  partner page root. Below 1600px nothing changes; above it, content centres
  instead of stretching. This caps `df31b35` at ultrawide rather than reverting
  it.
- **Typography:** semantic `clamp()` tokens, not a mechanical remap.
- **Referrals table:** cards below `md`, table at `md` and up.

### C1 — Height

- `src/app/partner/layout.tsx:12`: `h-screen` → `h-dvh`.
- `src/components/partner/partner-sidebar.tsx:76`: `h-screen` → `h-full`. The
  parent sizes it correctly in both placements — the desktop flex row and the
  drawer's `inset-y-0` panel.

### C2 — Width

Each of the six partner page roots (`page.tsx`, `earnings`, `link`, `promo`,
`referrals`, `settings`) already starts with a `p-4 md:p-6 space-y-6 pb-20`
wrapper. Add `mx-auto w-full max-w-[1600px]` to it.

### C3 — Typography tokens

Tailwind v4 is in use, and `src/app/globals.css` already declares an `@theme`
block. In v4 a `--text-<name>` custom property inside `@theme` generates a
`text-<name>` utility, so the tokens are declared there rather than as
hand-written utility classes:

```css
@theme {
  --text-eyebrow: clamp(0.625rem,  0.55rem + 0.20vw, 0.75rem);   /* 10 → 12px */
  --text-meta:    clamp(0.6875rem, 0.60rem + 0.25vw, 0.8125rem); /* 11 → 13px */
  --text-label:   clamp(0.75rem,   0.68rem + 0.30vw, 0.875rem);  /* 12 → 14px */
}
```

Mapping applied across the partner pages and components:

| Current | Becomes |
|---|---|
| `text-[8px]`, `text-[9px]`, `text-[10px]` | `text-eyebrow` |
| `text-[11px]`, `text-[12px]` | `text-meta` |
| `text-[13px]`, `text-[14px]` | `text-label` |

The rem floor means an 8px pill becomes 10px at 320px and 12px at 1600px. That
is a visible density change on the referrals table and the stat cards, and it is
the point — 8px was never readable.

The larger fixed sizes in `src/components/partner/referral-onboarding.tsx`
(`text-[15px]` up to `text-[40px]`) are display type on a landing-style page,
not UI chrome. They are out of scope here; changing them is a design decision
about that page, not a sizing bug.

### C4 — Grids

- `src/app/partner/link/page.tsx:70`: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`.
- `src/app/partner/referrals/page.tsx`: the `<table>` becomes `hidden md:table`,
  and a card list renders below `md` — email on the first line, plan and status
  as pills, `€/mo` and the partner's cut on the second. No horizontal scroll on
  a phone.

  This does mean two renderings of the same row data to keep in sync. That is
  the accepted cost of the chosen option; the alternative (a sticky first column
  with a scroll gradient) keeps one markup but keeps the horizontal scroll.

### Manual verification

At 320px, 390px, 768px, 1280px and 2560px, on every one of the six partner
pages: no horizontal page scroll, no text below 10px rendered, no content
trapped under the mobile browser toolbar, and stat cards that do not stretch
past 1600px total width.

---

## Sequencing

1. **Part A** — new table, new state-machine function, new library, click-path
   hook, one new alert type (`destination_recovered`).
2. **Part B** — depends on A only for the `down_since` component of the
   `destination_broken` dedup key. Everything else in B is independent.
3. **Part C** — touches no shared code with A or B. Can be built at any point.
