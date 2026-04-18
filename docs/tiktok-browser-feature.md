# TikTok Browser Detection & Overlay

**Date:** 2026-04-09

---

## What It Does

When a user clicks a Tappr link from inside TikTok's in-app browser, the platform detects this and can either:

1. **Show an overlay page** (default) — guides the user to tap `···` and "Open in browser" for the best experience
2. **Redirect directly** — skip the overlay and go straight to the destination URL

This is configurable per team in **Settings > Link Redirect Page > TikTok Browser**.

---

## Why It Matters

TikTok's in-app browser (BytedanceWebview) has significant limitations:
- **No cookies** — login sessions, shopping carts, and tracking pixels don't work properly
- **Limited JavaScript** — some websites break or render incorrectly
- **No app deep links** — links to Instagram, YouTube, App Store etc. won't open the native apps
- **No extensions** — ad blockers, password managers etc. are unavailable

By showing the overlay, users are guided to open the link in Safari/Chrome where everything works correctly. This significantly improves conversion rates for e-commerce, lead forms, and app installs.

---

## How It Works (Technical Flow)

```
User clicks link on TikTok
    │
    ▼
[/your-slug] route handler
    │
    ├── Detect TikTok via User-Agent
    │   (matches: TikTok, BytedanceWebview, musical_ly)
    │
    ├── Fetch team_settings.tiktok_browser_mode
    │
    ├── If "overlay" → redirect to /tiktok-open?url=<destination>
    │   │
    │   └── Shows branded page with:
    │       • Step 1: Tap ··· menu
    │       • Step 2: Select "Open in browser"
    │       • Fallback "Open Link" button
    │
    └── If "direct" → normal redirect to destination
```

---

## Files Created/Modified

| Action | File | Purpose |
|---|---|---|
| CREATED | `supabase/migrations/011_tiktok_browser_setting.sql` | Adds `tiktok_browser_mode` column |
| CREATED | `src/app/tiktok-open/page.tsx` | The overlay page users see |
| MODIFIED | `src/types/database.ts` | Added `tiktok_browser_mode` to team_settings type |
| MODIFIED | `src/app/[slug]/route.ts` | TikTok detection + overlay redirect |
| MODIFIED | `src/app/(dashboard)/dashboard/settings/page.tsx` | Radio button UI in redirect settings |

---

## Database

```sql
ALTER TABLE public.team_settings
  ADD COLUMN tiktok_browser_mode TEXT NOT NULL DEFAULT 'overlay'
  CHECK (tiktok_browser_mode IN ('overlay', 'direct'));
```

- `overlay` (default) — show the "Open in browser" instruction page
- `direct` — bypass overlay, redirect straight to destination

---

## Settings UI

Located in: **Settings > Link Redirect Page > TikTok Browser**

Two radio options:
- **Show instructions to open in browser** — "Show an overlay that guides users to tap ··· and open in their default browser"
- **Redirect directly to destination** — "Skip the redirect page and go directly to the link's destination"

---

## How to Test

### Method 1: Real TikTok (recommended)
1. Create a link in your Tappr dashboard (e.g. `tappr.me/test123`)
2. Post the link in a TikTok bio, comment, or DM
3. Tap the link from within TikTok
4. You should see the "Open in Browser" overlay page
5. Go to Settings > Link Redirect Page > change to "Redirect directly"
6. Save, then tap the link again — it should skip the overlay

### Method 2: Simulate TikTok User-Agent (dev/testing)
Use curl to simulate TikTok's browser:

```bash
# Should redirect to /tiktok-open overlay
curl -s -o /dev/null -w "HTTP %{http_code} → %{redirect_url}\n" \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TikTok/28.0.0" \
  "http://localhost:3000/YOUR-SLUG"

# Should redirect to the destination directly (normal browser)
curl -s -o /dev/null -w "HTTP %{http_code} → %{redirect_url}\n" \
  -A "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" \
  "http://localhost:3000/YOUR-SLUG"
```

### Method 3: Browser DevTools
1. Open Chrome DevTools (F12)
2. Click the ··· menu > More tools > Network conditions
3. Under "User agent", uncheck "Use browser default"
4. Paste TikTok's user agent:
   ```
   Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 TikTok/28.0.0
   ```
5. Navigate to your link — you should see the overlay page

### Method 4: Visit the overlay page directly
Go to `localhost:3000/tiktok-open?url=https://google.com` to see how the overlay page looks.

---

## User-Agent Detection

The following patterns trigger TikTok detection:

| Pattern | Source |
|---|---|
| `TikTok` | TikTok app (iOS & Android) |
| `BytedanceWebview` | TikTok's underlying WebView engine |
| `musical_ly` | TikTok's former app name (still in some older versions) |

Detection is case-insensitive.
