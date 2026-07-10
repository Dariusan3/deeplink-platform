# Tappr logo mark

## What it is

A "T" monogram built from two chain-link capsules: a crossbar and a stem that
loops up through it.

Chosen over the cursor-with-ripple concepts in the reference sheet. Those are
the most common mark in that whole grid — many products use a cursor + concentric
rings, so it is not ownable — and the fine ring strokes turn to mush below 20px.
The monogram does three things at once: it is the brand letter, it is a chain
link (the product is a link platform), and it survives as a 16px favicon.

**The mark was redrawn as vector.** Vector data cannot be extracted from a raster
screenshot; the geometry here is authored, not traced.

## Files

| File | Role |
|---|---|
| `src/components/brand/logo.tsx` | `TapprMark` (icon) and `TapprLogo` (icon + wordmark) |
| `src/app/icon.svg` | Favicon. Next links it as `<link rel="icon" sizes="any">` |
| `src/app/opengraph-image.tsx` | Same geometry, drawn inline for the OG card |

`TapprMark` inherits `currentColor`, so callers set the green via text color.
The accent dot is fixed lime `#BEF264` — the one hue that does not inherit.

Consumed by `Nav.tsx` and `Footer.tsx`, replacing the green rounded square that
stood in as a placeholder.

## Geometry — do not "fix" the open path

The crossbar is an **open** path. Its bottom edge deliberately stops at `x=11.4`
and resumes at `x=20.6`:

```
M20.6 13 L24 13 A4 4 0 0 0 24 5 L8 5 A4 4 0 0 0 8 13 L11.4 13
```

The stem's stroke spans `x 10.7..21.3`, so both stubs terminate underneath it
and read as joined. Closing this path fills in the bottom edge and the stem stops
reading as a separate link passing through.

## The bug that shaped this

The first version masked the crossbar with a widened copy of the stem to punch
the gap. Rendering `icon.svg` showed a notch bitten out of the crossbar's **top**
edge: the stem's top cap arcs up to `y=9`, and the mask stroke (width 6.4)
therefore reached `y≈5.8`, overlapping the top edge's stroke band (`y 3.7..6.3`).

Replacing the mask with an explicit gap fixed it and removed three things at
once: the SVG `<mask>`, the `useId` needed to keep mask ids unique across the
nav and footer instances, and the `"use client"` boundary that `useId` forced.
`TapprMark` is a plain server component.

Lesson: the mask variant type-checked and rendered a 200. It was only wrong when
looked at. Render the mark to PNG and view it after any geometry change.

## Verified

- `icon.svg` rendered to PNG and inspected — crossbar top edge continuous, stem
  reads as passing through, accent dot placed
- `/opengraph-image` rendered and inspected — mark legible at 44px in the card
- Landing HTML: zero `mask` ids, zero remaining green-square placeholders, mark
  present in both nav and footer
- `/icon.svg` 200 `image/svg+xml`; `/opengraph-image` 200 `image/png`
- `npx tsc --noEmit` clean

## Open

`src/app/favicon.ico` is the old asset and still ships as the legacy fallback
(`<link rel="icon" sizes="256x256" type="image/x-icon">`). Modern browsers prefer
`icon.svg`, so this only shows in old ones. Regenerate or delete it.
