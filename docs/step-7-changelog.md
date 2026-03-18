# Step 7: Collections (Link Grouping)

## What was implemented
- New `collections` table with RLS policies (migration file)
- `collection_id` column added to `links` table
- Collections page at `/dashboard/collections` with create, view, and delete
- Create collection dialog with name, description, and color picker (8 colors)
- Move-to-collection dialog for assigning links to collections
- Collection cards showing name, description, color indicator, and link count
- Delete confirmation dialog (links unassigned, not deleted)

## Database migration
- `supabase/migrations/002_collections.sql` — Run this migration against your Supabase instance

## Files created
- `supabase/migrations/002_collections.sql` — Collection table + RLS policies
- `src/hooks/use-collections.ts` — CRUD hook with move-links-to-collection
- `src/app/(dashboard)/dashboard/collections/page.tsx` — Collections page
- `src/components/collections/create-collection-dialog.tsx` — Create dialog with color picker
- `src/components/collections/move-to-collection-dialog.tsx` — Move links to a collection

## Files modified
- `src/types/database.ts` — Added collections table types and `collection_id` to links
- `src/components/sidebar.tsx` — Added "Collections" nav item

## How to test
1. Run the SQL migration `002_collections.sql` on your Supabase instance
2. Navigate to `/dashboard/collections` via sidebar
3. Create a collection with name, description, and color
4. Collection card shows with link count
5. Delete a collection (links are unassigned, not deleted)
