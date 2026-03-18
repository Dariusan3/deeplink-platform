# Step 5: Link Toolbar — Search, Filter, Bulk Actions

## What was implemented
- Search bar to filter links by title, slug, or destination URL (client-side)
- Status filter dropdown: All / Active / Paused
- Select-all checkbox and per-card selection checkboxes
- Bulk actions: "Pause" (deactivate selected) and "Delete" (remove selected)
- Selected count indicator
- "No links match your search" empty state

## Files created
- `src/components/links/link-toolbar.tsx` — Toolbar with search, filter, select-all, and bulk action buttons

## Files modified
- `src/components/links/link-list.tsx` — Added search/filter/selection state, integrated toolbar, client-side filtering
- `src/components/links/link-card.tsx` — Added optional `selected` and `onToggleSelect` props with checkbox UI

## How to test
1. Navigate to `/dashboard/links`
2. Search bar filters links as you type
3. Filter dropdown toggles between All/Active/Paused
4. Click the select-all checkbox or individual card checkboxes
5. With items selected, "Pause" and "Delete" bulk action buttons appear
6. Bulk actions operate on all selected links
