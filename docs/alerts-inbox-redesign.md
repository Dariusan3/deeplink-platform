# Alerts page: from dashboard to inbox

## The problem

The alerts page was unreadable at a glance. Not because any single piece was
wrong — because of how much of it there was before you reached an alert.

**~500px of chrome above the list.** Five stacked blocks: `PlanBanner` card →
hero card → four tier tiles → filter bar → collapsible "Detector metrics"
panel. Every one of them was defensible on its own; together they meant you
scrolled past a screenful of scaffolding to read the thing you came for.

**Three levels of nesting for groups that usually held one row.** Every alert
sat under a tier section heading (`CRITICAL — you might be losing money right
now`) *and* a category badge (`Destination broken`) *and* on a card with its own
icon. That's the same fact stated three times, in three type sizes.

**The card said "severity" three times.** A coloured `ring`, a coloured tint on
the icon, and a literal text badge reading `MEDIUM`.

**The raw destination URL was printed inline in the body copy.** From
`detectDestinationBroken`:

```
`${l.destination_url} responded with HTTP ${res.status}. Visitors clicking your link are reaching a broken page. Fix the destination URL or replace it.`
```

With a real UTM-tagged URL that's ~120 characters of query string wrapping across
three lines, occupying most of the card, and nobody reads it. It's reference
material, not a headline.

**The title was a sentence, not a label.** `Link "Webinar - Youtube - Angello
Lifestyle" destination returns 404` — quotes, link name, verb and status code all
competing for the same glance.

## The redesign

One alert = one row. Everything secondary lives behind an expand.

```
●  404   Webinar - Youtube - Angello Lifestyle   The destination responded…   Jul 5  🗑 ⌄
```

Expanded, the row grows a full-advice paragraph, the destination URL on its own
line in monospace, and the per-type CTA.

- **Tier and category became a filter and a chip.** Which is all they ever were.
  The four tier tiles and the tier section headings both collapse into one row of
  pills (`All · Critical · Opportunities · Strategic · Operational`, each with a
  count). Urgency is now carried by the sort — tier, then severity, then newest —
  instead of by which section a row lives in.
- **Severity is stated once**, as a 2px dot.
- **The leading chip carries the number the alert is actually about**: `404`,
  `-62%`, `97%`, `3.2×`, `184×`.
- **`PlanBanner` and the hero card merged into one `StatusStrip` line.** The plan
  and click cap stay unmissable (that was the point of the banner) — they just
  don't cost a screenful to say.
- **Detector metrics moved below the list.** It's diagnostics *about* the alerting
  system, not an alert.
- **The checkbox shares a slot with the severity dot.** Dot at rest, checkbox on
  hover or while a selection is open. One leading glyph instead of two.

## `src/lib/alert-display.ts`

New display-only module. Nothing persisted, no detector changed shape — the cron
keeps writing the same `title` / `description` / `metadata`. This just re-cuts
those three fields into what a dense row needs.

| Function | Returns |
|---|---|
| `alertBadge(a)` | The short code chip — `"404"`, `"-62%"`, `"97%"` |
| `alertSubject(a)` | The row headline |
| `alertSummary(a)` | The description with the raw URL taken back out |
| `alertUrl(a)` | The destination URL, on its own |

Two decisions worth keeping:

**`alertBadge` reads `metadata`, never the prose.** The detectors already write
`{ status: 404 }`, `{ drop_pct: 62 }`, `{ pct: 97 }`, `{ ratio: 3.2 }`. Parsing
the number back out of the title would mean a copy edit could silently break the
chip.

**`alertSubject` pulls the quoted name from an allowlist of types, not from any
title with quotes in it.** `destination_broken`, `click_drop` and `goal_hit`
phrase their titles as `… "Link name" …`, where the quoted thing is what you're
scanning for. `ab_winner` quotes the *test* name while its subject is the winning
variant — a blanket "grab the first quoted string" would headline the wrong noun
there, so it falls through to the full title. The regex is double-quote-only,
because the titles contain `'` inside words ("You've", "don't") and a quote class
that included the apostrophe would match across half a sentence.

## The "Detector metrics" panel

Same disease, second location. It was a 12-card grid split into three sections —
"Health & limits", "Performance & wins", "Audience & housekeeping" — each with a
heading *and* a subtitle, sitting under a "Live metrics" heading *and* its own
subtitle, all inside a disclosure that already said "Detector metrics". Four
levels of titling for a diagnostics panel.

Worse, it didn't answer its own question. The panel exists to explain **why a
detector did or didn't fire** — which is a reading next to a threshold. It showed
the reading and omitted the threshold.

It's still a card grid — that part read well. What changed is what's *on* a card
and where the panel lives.

Each card now carries the rule under the reading:

```
┌──────────────────────┐  ┌──────────────────────┐
│ ⏲ PLAN USAGE         │  │ 🛡 TOP IP, LAST HOUR │
│ 82%                  │  │ 4 hits               │
│ 41,201 / 50,000 ·    │  │ 81.2.x.x · fires at  │
│ fires at 80% and 100%│  │ 30+ in 60 min        │
└──────────────────────┘  └──────────────────────┘
```

Five states, three colours: `firing` (red — condition true, bad news), `winning`
(green — condition true, good news: a spike, an A/B winner), `near` (amber),
`quiet` (no colour — the resting state, and most cards most days; if everything is
lit, nothing means anything), `off`.

### Where it lives

Below the list was wrong. With 20 open alerts you had to scroll past every one of
them to reach the panel that explains why they exist. It's back **above the list**,
collapsed — one ~40px bar that doesn't move no matter how long the list gets.

Two cards also went away because they were saying the same thing twice: "Today vs
7-day avg" and "Clicks today" were one number framed two ways, and "Plan usage"
duplicated the bar now sitting in the `StatusStrip` at the top of the page. Peak
hour stayed, dimmed, labelled "detector off, it flapped daily" — the number is
still worth a glance, and a row that silently vanished would read as a bug rather
than a decision.

### Bug found on the way

`AlertMetrics.planCap` was typed `number` and held the `Infinity` that
`planClickCap()` returns for Agency. But the struct ships over the wire, and
`JSON.stringify(Infinity)` is `null` — so the type promised a number the client
never received, and `m.planCap.toLocaleString()` threw for **every Agency customer
who opened the alerts page**. It's now `number | null`, and `monthPct` is 0 rather
than a meaningless `used / Infinity` for uncapped plans.

## Verified

`tsc --noEmit` clean, `eslint` clean, `npm run build` succeeds.
