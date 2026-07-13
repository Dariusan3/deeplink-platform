# Missing `cursor: pointer` on clickable elements

## Symptom

Hovering a button, tab, checkbox, select or menu item anywhere in the app showed the normal
arrow cursor instead of the pointing hand. Nothing looked clickable.

## Cause

Tailwind v4's preflight sets `button { cursor: default }` — a deliberate break from v3, which
gave buttons `cursor: pointer`. This project is on `tailwindcss@^4` and had no rule overriding
it, so every button in the app quietly lost its pointer.

Evidence that people had been working around it one component at a time: **56** hand-written
`cursor-pointer` classes were already scattered through `src/**/*.tsx`. Those are now redundant
(harmless, left in place).

## Fix

### 1. One base rule in `src/app/globals.css`

Restores the pointer for everything interactive:

```css
button:not(:disabled),
[role="button"]:not(:disabled),
[role="tab"]:not([aria-disabled="true"]),
[role="option"]:not([aria-disabled="true"]),
[role="menuitem"]:not([aria-disabled="true"]),
[role="switch"]:not(:disabled),
[role="checkbox"]:not(:disabled),
[role="radio"]:not(:disabled),
label[for],
summary,
select:not(:disabled),
a[href] {
  cursor: pointer;
}

button:disabled,
select:disabled,
[aria-disabled="true"] {
  cursor: not-allowed;
}
```

The `role="…"` selectors matter because the Radix/shadcn primitives (tabs, checkboxes, switches,
dropdown items) render as `div`s with an ARIA role rather than as `<button>`.

### 2. Two clickable `<div>`s that CSS cannot reach

React attaches handlers by delegation, so there is no `onclick` attribute in the DOM for a CSS
selector to target. A `<div onClick={…}>` therefore has to be fixed by hand.

Scanning every `.tsx` for `<div>`/`<span>` opening tags carrying an `onClick` but no cursor class
(brace-aware, so `onClick={() => …}` doesn't break the parse) turned up three. Two were real and
got `cursor-pointer`:

- `src/components/collections/collections-canvas.tsx:76`
- `src/components/collections/collections-tree.tsx:324`

The third — `src/components/pricing/free-plan-button.tsx:73` — is a modal backdrop whose click
closes the dialog. Left alone deliberately: a default cursor on a backdrop is the convention, and
a pointer there would suggest the overlay itself is a control.

## Known limitation — `not-allowed` will not show on disabled buttons

`shadcn/tailwind.css` ships `button:disabled { pointer-events: none }`. An element with
`pointer-events: none` receives no pointer events at all, so its `cursor` is never applied — the
browser shows whatever the parent's cursor is.

That means the `cursor: not-allowed` above is **inert on disabled `<button>`s**. It does work for
`select:disabled` and `[aria-disabled="true"]`, which don't carry that rule.

Left as-is on purpose. Making it work would mean overriding shadcn's `pointer-events` with
`!important`, which trades a real behavioural guarantee (a disabled button cannot be clicked,
and cannot swallow a click meant for something underneath it) for a cursor glyph. Not worth it.
Disabled buttons still read as disabled through their opacity.

## Verification

- `npx next build` — compiled successfully.
- The rule was confirmed present in the **built** CSS bundle, not just the source:
  ```
  button:not(:disabled),[role=button]:not(:disabled),…,a[href]{cursor:pointer}
  ```

Not verified: the cursor visually changing on hover in a browser — worth a quick pass over the
dashboard, especially the Radix-based controls (tabs, checkboxes, dropdown menus), since those
depend on the `role="…"` selectors rather than the `button` one.

## Files changed

- `src/app/globals.css`
- `src/components/collections/collections-canvas.tsx`
- `src/components/collections/collections-tree.tsx`
