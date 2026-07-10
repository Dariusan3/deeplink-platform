# Fix: POST /api/v1/links silently dropped `redirect_rules`

## The bug

The landing page (`ProductBento.tsx`, cell `/05`) advertised **"REST API. Bearer
auth, full smart-routing"** and showed this `curl`:

```json
{ "destination_url": "https://shop.io", "slug": "promo",
  "redirect_rules": [ { "country": "US", "destination": "apps.apple.com/x" } ] }
```

`POST /api/v1/links` typed its body as `{ destination_url?, slug?, title? }` and
inserted only those three columns. `redirect_rules` was never read. The request
returned **201 Created** and produced a link with no routing rules at all.

Two separate defects:

1. **The endpoint ignored the field.** The `redirect_rules` column exists, the
   redirect engine (`src/app/[slug]/route.ts`) evaluates it, the dashboard rules
   dialog writes it, and `GET /api/v1/links/[id]` returns it. Only `POST` was
   never wired up.
2. **The advertised shape was wrong anyway.** The real shape is `RedirectRule`
   in `src/types/links.ts` — `{ priority, conditions: { geo?, device?, time? },
   destination_url }` — not `{ country, destination }`. Even once the field was
   read, the documented payload would not have routed.

Any developer copy-pasting the homepage example got a 201 and a broken link.

## The fix

**`src/lib/redirect-rules.ts` (new)** — `parseRedirectRules(raw, platformHost)`
validates a payload against exactly what `evaluateConditions` reads at redirect
time. Lives in `lib/` rather than inline in the route so it can be unit-tested
without a database or an API credential, and so `PATCH /links/[id]` can reuse it.

It enforces:

| Rule | Behavior |
|---|---|
| top level | must be an array, max 50 rules |
| `destination_url` | required, normalized, valid URL, may not point at the platform |
| `priority` | optional integer; defaults to declaration order (engine sorts ascending) |
| `conditions.geo.countries` | array of strings, upper-cased |
| `conditions.device.types` | non-empty subset of `mobile`, `tablet`, `desktop` |
| `conditions.time.after/before` | ISO 8601 date strings |
| `conditions.time.daysOfWeek` | integers 0–6 (0 = Sunday) |
| `conditions.time.hourStart/hourEnd` | integers 0–23, **both or neither** (the engine only applies the window when both are present) |
| `conditions: {}` | always matches — this is how a catch-all default rule is written |

**`src/app/api/v1/links/route.ts`** — POST now parses `redirect_rules` when
present, returns `400` with a field-pointing message on bad input
(e.g. `redirect_rules[1].conditions.device.types must be a non-empty subset of
mobile, tablet, desktop`), persists the rules, and returns them in the response.

**`src/components/landing/ProductBento.tsx`** — the `curl` example was rewritten
to the real `RedirectRule` shape. It is now byte-for-byte valid against the
endpoint.

## Verified

Unit test drove `parseRedirectRules` with the landing page payload verbatim,
then fed the parsed rules through a mirror of the engine's `evaluateConditions`:

- landing payload accepted; 2 rules, priorities 0/1
- `US` + `mobile` matches rule 0; `US` + `desktop` does not
- `RO` matches rule 1; `DE` matches neither
- rejects: non-array, missing `destination_url`, self-referential destination,
  invalid device type, `hourStart` without `hourEnd`, `daysOfWeek` out of range
- `conditions: {}` behaves as a catch-all
- overnight window (`hourStart: 22, hourEnd: 6`) accepted

All pass. `npx tsc --noEmit` clean. Unauthenticated `POST` still returns 401.

**Not verified end-to-end against the live endpoint** — that would require
minting an API key row in the production database, i.e. creating a real live
credential. Do that manually from the dashboard's developer settings and run the
homepage `curl` once before relying on it.

## Also in this pass

`ProductBento.tsx` cells `/02` (AI Brain) and `/03` (Real-Time Alerts) told the
same story: both `−67%`, both a deleted Instagram post, both "DM the account" —
and they disagreed on the window (`12h` vs `90 minutes`). `Problem.tsx` cell
`/01` tells that drop story a third time.

`/03` now renders a `traffic_spike`, a different real detector from
`src/lib/alert-detectors.ts`, with copy modeled on the message that detector
emits. It is styled blue rather than green so it does not read as a duplicate of
the green AI Brain box directly above it.

## Still open

- `+ ADD RULE` in cell `/01` has `cursor-pointer` and hover states but no
  `onClick`. It is decoration inside a mock; it looks clickable and is not.
- Cell `/04` (A/B Testing) leaves a large vertical gap because `/05` (Developer
  API) is much taller.

## Related
- `docs/landing-page-audit.md`
