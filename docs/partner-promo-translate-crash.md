# Partner Content Ideas: client-side crash after "Generează idei"

## Symptom
Some partners see "Application error: a client-side exception has occurred" on
`/partner/promo` right after clicking the generate button. Not reproducible for
everyone.

## Suspected cause (not confirmed with a console trace)
`<html lang="en">` in `src/app/layout.tsx` while the partner pages are written in
Romanian. Chrome offers/auto-applies Google Translate, which wraps text nodes in
`<font>` elements. When React then swaps a bare text node (the button label
changes "Generează idei" -> "Generez..." -> "Generează alte idei", and
"Copiază tot" -> "Copiat"), it calls `removeChild`/`insertBefore` on a node that
is no longer where it expects, and throws. The screenshot showed the Chrome
translate icon in the address bar.

## Fix
`src/app/partner/promo/page.tsx`:
- root div gets `lang="ro" translate="no"` so Chrome does not translate the page
- dynamic button labels are wrapped in `<span>` so React replaces an element's
  content instead of a bare text node next to an icon

## To confirm
Ask an affected user for the console error. A `NotFoundError: Failed to execute
'removeChild' on 'Node'` confirms it. If a different error shows up, this fix is
not the answer.

## Possible follow-ups
- Other Romanian-language partner pages (`/partner/*`) have the same exposure.
  Consider `lang="ro"` on the partner layout.
- No `error.tsx` boundary exists under `src/app`; a crash shows Next's bare
  fallback instead of a retry UI.
