# Destination URL Normalization

Every destination URL stored in `links.destination_url` (and inside `redirect_rules[*].destination_url`) is canonicalized:

1. **Trim whitespace** — surrounding spaces removed
2. **Force https://** — missing protocol → prepended; `http://` → upgraded to `https://`

The hostname is preserved verbatim, including any leading `www.`. Earlier we stripped it, but a non-trivial number of destinations only respond on the `www` subdomain, so stripping broke those links.

So `example.com` → `https://example.com`, `http://www.shop.io/x` → `https://www.shop.io/x`, `https://app.example.com` → unchanged.

## Three layers (defense-in-depth)

| Layer | Where | What it does |
|---|---|---|
| Helper | [src/lib/url-normalize.ts](../src/lib/url-normalize.ts) | `normalizeDestinationUrl(input)` — single source of truth |
| Client | [create-link-dialog](../src/components/links/create-link-dialog.tsx), [quick-create](../src/components/dashboard/quick-create.tsx), [bulk-import-dialog](../src/components/links/bulk-import-dialog.tsx), [rules-dialog](../src/components/links/rules-dialog.tsx), [edit page](../src/app/(dashboard)/dashboard/links/[id]/page.tsx) | Calls helper before every `createLink` / `updateLink` |
| API | [/api/v1/links POST](../src/app/api/v1/links/route.ts) + [PATCH](../src/app/api/v1/links/[id]/route.ts) | Normalizes server-side before insert/update |
| DB | [migration 016](../supabase/migrations/016_normalize_destination_url.sql) + [017](../supabase/migrations/017_keep_www_in_destination_url.sql) | `links_normalize_destination_trigger` BEFORE INSERT/UPDATE — last-resort guard for direct SQL inserts |

## Why all three layers?

The DB trigger alone would be enough for correctness, but:
- Client normalization gives instant feedback (the URL the user sees in the UI matches the URL stored)
- API normalization protects 3rd-party API users + bulk imports
- DB trigger covers anyone bypassing the app (SQL editor, ad-hoc scripts, future migrations)

## Migration

`supabase/migrations/016_normalize_destination_url.sql` includes a one-time backfill that forces https on every existing row. Migration `017_keep_www_in_destination_url.sql` updates the trigger to stop stripping `www.`. Both are idempotent and safe to re-run.

Existing rows stored before 017 may have had their `www.` stripped — they remain reachable for hosts that accept either form. For destinations that only respond on `www`, the user can re-save the link with `www.` and it will now be preserved.

After applying, verify:
```sql
SELECT destination_url FROM links
WHERE destination_url LIKE 'http://%';
-- Should return 0 rows. Rows with 'https://www.' are now allowed.
```
