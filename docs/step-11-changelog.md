# Step 11: Settings Page (Link Settings, Display Settings, Link Redirect Page)

## What was implemented
- Full settings page with left sidebar sub-navigation (Link Settings, Display Settings, Link Redirect Page)
- **Display Settings**: Toggle for link creation confirmation popup, timezone selector for analytics
- **Link Settings**: Default domain input, danger zone with purge data button
- **Link Redirect Page**: Toggle for "App & Tap to Continue", toggle for branding (with Premium badge)
- Profile editor (name field) integrated into settings sidebar
- Team-scoped settings stored in `team_settings` table with auto-creation of defaults
- All toggles and inputs save individually per section with toast feedback

## Database migration
Run `supabase/migrations/003_settings_and_api_keys.sql` on your Supabase instance.

This creates:
- `team_settings` table with columns: show_link_creation_confirmation, timezone, default_domain, show_app_tap_to_continue, show_branding
- RLS policies for team member access

## Files created
- `src/hooks/use-settings.ts` — CRUD hook for team_settings with auto-creation of defaults
- `supabase/migrations/003_settings_and_api_keys.sql` — Migration for team_settings and api_keys tables

## Files modified
- `src/app/(dashboard)/dashboard/settings/page.tsx` — Complete rewrite with tabbed settings UI
- `src/types/database.ts` — Added team_settings and api_keys table types

## How to test
1. Navigate to `/dashboard/settings`
2. Left sidebar shows profile card + 3 settings tabs
3. **Link Settings** tab: change default domain, click Save Settings
4. **Display Settings** tab: toggle confirmation, change timezone, save
5. **Link Redirect Page** tab: toggle app tap and branding, save
6. Settings persist across page reloads
