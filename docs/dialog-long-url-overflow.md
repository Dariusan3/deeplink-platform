# Smart Routing dialog: long URLs blew out the layout

## Symptom

Opening Smart Routing on a link with a long destination (e.g. a Typeform URL carrying
`?utm_source=…&utm_medium=…&utm_campaign=…`) pushed the dialog wider than its own `max-width`.
Everything on the right got clipped — not just the URL, but the explainer banner
("Leave a co…") and the empty-state copy ("based o…") too.

## Cause

`DialogContent` in `src/components/ui/dialog.tsx` is a CSS **grid**. Grid items default to
`min-width: auto`, which means they refuse to shrink below their **min-content** width.

The subtlety is *which* element that rule bites. `truncate` (Tailwind) expands to
`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`. The `overflow: hidden` part
does cancel `min-width: auto` — but **only for the element that is itself the grid/flex item**.

In `rules-dialog.tsx` the grid item was the plain wrapper `<div class="space-y-6 py-6">`, which
has `overflow: visible`. The `truncate`d `<p>` was a normal block *inside* it. So:

- the `<p>` has `white-space: nowrap` → its min-content width is the entire URL on one line
- the wrapper div's min-content width therefore equals the entire URL
- the wrapper is a grid item with `overflow: visible` → `min-width: auto` holds → it will not
  shrink below that
- the grid track expands, the dialog's `max-width` loses, and `truncate` never gets a chance to
  fire because the box it lives in is already as wide as the text

This is why the URL rendered in full and *everything else* got clipped, rather than the URL
being ellipsised as intended.

## Fixes

### 1. `src/components/links/rules-dialog.tsx` — the actual bug

The destination is now `break-all` instead of `truncate`. Breaking anywhere makes the
paragraph's min-content one character wide, which severs the chain described above.

It is also the better display: this is the URL the user opened the dialog to *verify*, and an
ellipsis hides the query string — the exact part worth checking on a link like
`?utm_source=whatsapp&utm_campaign=…`.

The dialog title got `min-w-0` + `wrap-break-word` + `pr-8` so a long link title wraps instead
of shoving the close button out of the dialog.

### 2. `src/components/ui/dialog.tsx` — defence in depth

`grid` → `grid grid-cols-[minmax(0,1fr)]`. This caps the implicit column's minimum at 0 so a
nowrap child can no longer expand the track past the dialog's `max-width`. It does not fix a
grid *item* that still carries `min-width: auto`, so it is a backstop, not a substitute for
`min-w-0` / breakable text — but it stops the failure mode from being silent and total.

(Tailwind v4 note: `break-words` is now spelled `wrap-break-word`. `break-all` is unchanged.)

## Other URL renders — checked, all already safe

Since the question was "does this happen anywhere else with a long link", every place that
renders `destination_url` was checked:

| Location | Why it's fine |
|---|---|
| `links/link-analytics-dialog.tsx:127` | `truncate` on a flex item (overflow:hidden cancels its own min-width) + `max-w-md` |
| `links/link-card.tsx:171` | `truncate` + explicit `max-w-[200px]` |
| `collections/add-link-to-collection-dialog.tsx:268` | wrapper already has `min-w-0` |
| `collections/link-info-panel.tsx:151` | `truncate` span is itself the flex item |
| `collections/collections-canvas.tsx:182` | shows the host only, not the full URL |
| `dashboard/collections/page.tsx:441` | wrapper already has `min-w-0` |

`rules-dialog.tsx` was the only one where the truncated text sat inside a plain block that was
itself the grid item — the one arrangement that breaks.

## Verification

- `npx tsc --noEmit` — clean.
- `npx next build` — compiled successfully.

Not verified: the dialog rendering visually at the fixed width. Worth reopening Smart Routing
on that WhatsApp / Webinar Replay link to confirm the URL now wraps inside the box and the
banner text is no longer cut off.

## Files changed

- `src/components/links/rules-dialog.tsx`
- `src/components/ui/dialog.tsx`
