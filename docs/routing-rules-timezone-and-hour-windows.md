# Routing rules: timezone and hour windows

## What was checked

Whether the Smart Routing rules (country / device / days-of-week / time-of-day) actually take
effect on a click. Country, device, and the catch-all rule (all conditions left as "Any") were
correct. **Both time-based conditions were broken.**

Note also: no link in the database had any rules saved at the time of the audit
(`select … where jsonb_array_length(redirect_rules) > 0` returned zero rows), so nobody has been
silently mis-routed by this in production yet.

## Bug 1 — hour and day-of-week were evaluated in the *server's* timezone

The engine read `now.getHours()` and `now.getDay()`. Those are the local time of the **process**,
which on Vercel is UTC.

The team's timezone already existed and was already being honoured elsewhere:
`team_settings.timezone` (text, default `'UTC'`), set by the user in Settings, and used by
analytics via `src/lib/format-date.ts`. **Only the redirect engine ignored it.**

So a user in Bucharest setting "9 AM – 5 PM" was actually getting 9–17 **UTC**, i.e. 12:00–20:00
their time. Three hours off, silently.

The nasty part: a dev machine runs in the developer's own zone, so the rule behaved *correctly*
in local development and only broke in production. Demonstrated by running the same assertion
under two `TZ` values:

```
rule 9->17, visitor at 08:00 UTC
  TZ=Europe/Bucharest (dev Mac):  getHours()=11  ->  MATCH
  TZ=UTC              (Vercel):   getHours()=8   ->  NO match
```

Same rule, same instant, opposite outcome.

Days-of-week had the same flaw across the midnight boundary: a click at 23:00 UTC on a Sunday is
already Monday in Bucharest, so a "Mondays only" rule disagreed with the calendar the user was
looking at when they set it.

### Fix

`evaluateConditions` now takes the team's `timezone` and resolves the hour and weekday in it, via
`getHourInTimezone()` (already existed) and a new `getDayOfWeekInTimezone()` in
`src/lib/format-date.ts`. An unrecognised zone falls back to UTC rather than throwing — a bad
setting must not take the redirect down.

The resolver passes it through. The zone is cached alongside the link (see
`src/lib/link-cache.ts`), so a time-based rule costs no extra round-trip per click.

The dialog now labels the field with the zone it will actually be read in — `Time of Day
(Europe/Bucharest)` — because "9 AM" without a zone is a guess.

## Bug 2 — a half-filled hour range was silently dropped

The dialog lets you set `From: 9 AM` and leave `To: Any`. It saved fine. But the engine applied
the window **only when both bounds were present**, so the whole condition was discarded and the
rule fired 24/7.

Confirmation that this was recognised as invalid elsewhere in the codebase: the **public API**
validator (`parseRedirectRules`) rejected the exact same payload with
`"requires both hourStart and hourEnd, or neither"`. The validator knew. The dashboard dialog
bypassed it entirely by writing straight to Supabase through `updateLink`.

### Fix

One-sided windows are now supported properly, since that is what a user reasonably expects:

- `From 9` → 09:00 until end of day
- `To 17` → midnight until 17:00 (upper bound exclusive, unchanged)
- Overnight ranges (`22 → 6`) still work

The API validator was relaxed to match — it no longer rejects something the engine now handles.

## Structural fix — the two halves lived apart

`evaluateConditions` was a module-private function inside `src/app/[slug]/route.ts`, while its
validator `parseRedirectRules` lived in `src/lib/redirect-rules.ts`. The validator's own comment
said: *"Anything this accepts must be something that function can read"* — and they had drifted
apart anyway (bug 2 is exactly that drift).

The engine has been moved next to the validator in `src/lib/redirect-rules.ts`. They are now
impossible to read without seeing each other, and the engine is unit-testable.

## Cache interaction

The slug resolver caches each link together with its team's timezone. Changing the timezone in
Settings therefore invalidates **every** link the team owns, not just one slug —
`invalidateTeamLinks()` in `src/lib/link-cache.ts`, triggered from `useSettings().updateSettings`
when `timezone` changes, via `POST /api/cache/revalidate` with a `teamId`.

That endpoint now verifies team membership before honouring a `teamId` purge, so one team cannot
force cache churn on another.

Saving rules from the dialog goes through `updateLink` in the links provider, which already
purges the slug — verified, not assumed.

## Verification

The engine was exercised directly (`evaluateConditions` + `parseRedirectRules`, the real
functions) across 18 assertions, run under three different **server** timezones — `UTC`
(production), `Europe/Bucharest` (dev machine), and `America/Los_Angeles` — with the *team* zone
held at `Europe/Bucharest`.

**All pass in every server zone**, which is the actual property that matters: the outcome must
depend on the team's timezone and not on wherever the code happens to run.

Covered: country matching (including case-insensitivity), device matching, catch-all, hour window
boundaries (start inclusive / end exclusive), one-sided windows in both directions, overnight
windows, day-of-week across the midnight boundary, validator agreement, and a garbage timezone
falling back to UTC.

`npx tsc --noEmit` clean; `npx next build` compiled successfully.

### Not verified

An end-to-end click through a real short link with rules attached. No link in the database has
rules, and creating one would mean writing to the live project. The engine is proven in
isolation and the wiring into `src/app/[slug]/route.ts` is a direct pass-through, but the full
round trip is worth one manual check: save a rule with a narrow hour window, then open the link.

## Files changed

- `src/lib/redirect-rules.ts` — engine moved here; timezone support; one-sided windows; validator relaxed
- `src/lib/format-date.ts` — new `getDayOfWeekInTimezone()`
- `src/app/[slug]/route.ts` — imports the engine, passes the team timezone
- `src/lib/link-cache.ts` — caches the team timezone; `invalidateTeamLinks()`
- `src/app/api/cache/revalidate/route.ts` — accepts `teamId` (membership-checked)
- `src/lib/revalidate-slug.ts` — `teamId` passthrough
- `src/hooks/use-settings.ts` — purges the team's links when the timezone changes
- `src/components/links/rules-dialog.tsx` — labels the hour fields with the team's zone
