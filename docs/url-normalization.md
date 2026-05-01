# Destination URL Normalization

Every destination URL stored in `links.destination_url` (and inside `redirect_rules[*].destination_url`) is canonicalized:

1. **Trim whitespace** — surrounding spaces removed
2. **Force https://** — missing protocol → prepended; `http://` → upgraded to `https://`
3. **Strip leading `www.`** — only the literal `www` is stripped. `app.example.com`, `shop.example.com`, etc. are preserved.

So `example.com` → `https://example.com`, `http://www.shop.io/x` → `https://shop.io/x`, `https://app.example.com` → unchanged.

## Three layers (defense-in-depth)

| Layer | Where | What it does |
|---|---|---|
| Helper | [src/lib/url-normalize.ts](../src/lib/url-normalize.ts) | `normalizeDestinationUrl(input)` — single source of truth |
| Client | [create-link-dialog](../src/components/links/create-link-dialog.tsx), [quick-create](../src/components/dashboard/quick-create.tsx), [bulk-import-dialog](../src/components/links/bulk-import-dialog.tsx), [rules-dialog](../src/components/links/rules-dialog.tsx), [edit page](../src/app/(dashboard)/dashboard/links/[id]/page.tsx) | Calls helper before every `createLink` / `updateLink` |
| API | [/api/v1/links POST](../src/app/api/v1/links/route.ts) + [PATCH](../src/app/api/v1/links/[id]/route.ts) | Normalizes server-side before insert/update |
| DB | [migration 016](../supabase/migrations/016_normalize_destination_url.sql) | `links_normalize_destination_trigger` BEFORE INSERT/UPDATE — last-resort guard for direct SQL inserts |

## Why all three layers?

The DB trigger alone would be enough for correctness, but:
- Client normalization gives instant feedback (the URL the user sees in the UI matches the URL stored)
- API normalization protects 3rd-party API users + bulk imports
- DB trigger covers anyone bypassing the app (SQL editor, ad-hoc scripts, future migrations)

## Caveat: stripping `www.`

A small minority of websites only respond at the `www` subdomain (their server doesn't redirect non-www → www). For those, stripping breaks the link.

If a user reports a broken link after this change, the workaround is to manually re-enter the URL — but the trigger will re-strip on save. The proper fix would be to add a per-link `keep_www` flag; not implemented yet because in practice virtually all modern hosts handle either form.

## Migration

`supabase/migrations/016_normalize_destination_url.sql` includes a one-time backfill that normalizes every existing row. Safe to re-run — the helper is idempotent (`https://example.com` stays `https://example.com`).

After applying, verify:
```sql
SELECT destination_url FROM links
WHERE destination_url LIKE 'http://%'
   OR destination_url LIKE 'https://www.%';
-- Should return 0 rows.
```
