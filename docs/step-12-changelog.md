# Step 12: Developer API + API Key Management

## What was implemented

### Developer API (REST endpoints)
- `GET /api/v1/links` — List all links (paginated)
- `POST /api/v1/links` — Create a new link
- `GET /api/v1/links/:id` — Get a single link
- `PATCH /api/v1/links/:id` — Update a link
- `DELETE /api/v1/links/:id` — Delete a link
- `GET /api/v1/stats` — Get click statistics (filterable by link_id and days)
- All endpoints authenticated via Bearer token (API key)
- API keys hashed with SHA-256 before storage (raw key shown only once)
- Proper error handling, input validation, and status codes

### API Key Management
- Generate API keys from the Developer API page
- Keys use format `dl_<32 random chars>`
- Only the hash is stored; raw key shown once on generation
- Show/hide toggle for newly generated key
- Copy-to-clipboard functionality
- Revoke (delete) API keys
- Last used timestamp tracking

### Developer API Documentation Page
- Full API reference with left sidebar navigation
- Sections: Getting Started, Authentication, Rate Limit, Response Handling, Links, Statistics
- Code examples in cURL and Node.js with copy buttons
- API key management panel on right sidebar
- Quick info cards (rate limit, auth type, format)

## Database migration
Run `supabase/migrations/003_settings_and_api_keys.sql` (same file as Step 11).

This creates:
- `api_keys` table with columns: team_id, user_id, name, key_hash, key_prefix, last_used_at, expires_at, is_active
- Indexes on team_id and key_hash for fast lookups
- RLS policies for team member access

## Files created
- `src/lib/api-auth.ts` — API key authentication helper (hash verification, expiry check)
- `src/app/api/v1/links/route.ts` — Links list + create endpoints
- `src/app/api/v1/links/[id]/route.ts` — Link get/update/delete endpoints
- `src/app/api/v1/stats/route.ts` — Statistics endpoint
- `src/hooks/use-api-keys.ts` — Hook for API key CRUD with SHA-256 hashing
- `src/app/(dashboard)/dashboard/developer/page.tsx` — Full API docs page with key management

## Files modified
- `src/components/sidebar.tsx` — Added "Developer API" nav item
- `src/types/database.ts` — Added api_keys table types

## How to test
1. Navigate to `/dashboard/developer`
2. Generate an API key — copy the raw key (shown only once)
3. Browse the documentation sections using the left sidebar
4. Test the API with cURL:
   ```bash
   curl http://localhost:3000/api/v1/links \
     -H "Authorization: Bearer dl_your_api_key_here"
   ```
5. Create a link via API:
   ```bash
   curl -X POST http://localhost:3000/api/v1/links \
     -H "Authorization: Bearer dl_your_api_key_here" \
     -H "Content-Type: application/json" \
     -d '{"destination_url": "https://example.com"}'
   ```
6. Revoke an API key from the dashboard
