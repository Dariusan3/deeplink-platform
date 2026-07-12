# Legal pages: duplicate Privacy · Terms · Contact links

## Problem

On `/privacy` and `/terms`, the links **Privacy · Terms · Contact** appeared twice near the
bottom of the page: once directly below the legal copy, and again inside the landing footer.

## Cause

`src/components/legal/legal-shell.tsx` rendered its own link row after `{children}`, and then
also rendered `<Footer />` (`src/components/landing/Footer.tsx`), which already contains the
same three links.

## Fix

Removed the inline link row from `LegalShell`. The landing `Footer` is now the single source
of those links, so legal pages match every other page on the site.

The `Link` import stays — it is still used by the "← Back to Tappr" breadcrumb.

## Files changed

- `src/components/legal/legal-shell.tsx`
