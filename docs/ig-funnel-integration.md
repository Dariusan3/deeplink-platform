# Instagram Funnel Integration

**Date:** 2026-03-31

---

## Overview

Full Instagram integration that fetches profile insights via the Instagram Graph API and displays a funnel visualization on the dashboard: **IG Profile Views → Link Clicks**, with click-through rate calculation.

---

## What Was Built

### 1. Updated OAuth Scope

**File:** `src/app/(dashboard)/dashboard/settings/page.tsx`

Added `instagram_business_manage_insights` permission to the OAuth authorization URL. This is required to access the Instagram Insights API for profile views, impressions, and reach metrics.

**Scopes requested:**
- `instagram_business_basic` — profile info, username, followers
- `instagram_business_manage_insights` — profile_views, impressions, reach

### 2. Instagram Insights API Route

**File:** `src/app/api/ig/insights/route.ts`

Server-side GET endpoint that:
- Authenticates the user via Supabase session
- Fetches the active IG integration for the team
- Calls Instagram Graph API v22.0 for:
  - **Profile info**: username, account_type, followers_count, follows_count, media_count
  - **Insights (last 30 days)**: profile_views, impressions, reach (daily breakdown)
- Validates token expiry before making API calls
- Returns aggregated totals + daily breakdowns

**Endpoint:** `GET /api/ig/insights?teamId=<team_id>`

### 3. IG Insights Hook

**File:** `src/hooks/use-ig-insights.ts`

Client-side hook that:
- Checks if Instagram is connected (via `useInstagram`)
- Fetches insights from the API route on mount
- Returns: `profile`, `insights`, `loading`, `error`, `isConnected`
- Auto-fetches when team changes or IG connection status changes

### 4. Funnel Visualization Component

**File:** `src/components/dashboard/ig-funnel.tsx`

Dashboard widget showing:
- **Profile stats row**: followers count, 30-day reach
- **Visual funnel**: Profile Views → Link Clicks with proportional bars
- **Click-through rate**: percentage of profile viewers who clicked a link
- **Color-coded CTR**: green (>5%), amber (1-5%), red (<1%)

**States handled:**
- Not connected → shows "Connect Instagram" CTA linking to Settings
- Loading → skeleton placeholders
- Error → error message with reconnect link if token expired
- Connected → full funnel visualization

### 5. Dashboard Integration

**File:** `src/app/(dashboard)/dashboard/page.tsx`

The `IgFunnel` component is placed in the right sidebar of the dashboard, above Recent Activity. If Instagram isn't connected, it shows a subtle CTA — not intrusive.

---

## Files Created/Modified

| Action | File |
|---|---|
| MODIFIED | `src/app/(dashboard)/dashboard/settings/page.tsx` — added insights scope |
| CREATED | `src/app/api/ig/insights/route.ts` — IG Graph API proxy |
| CREATED | `src/hooks/use-ig-insights.ts` — client-side insights hook |
| CREATED | `src/components/dashboard/ig-funnel.tsx` — funnel visualization |
| MODIFIED | `src/app/(dashboard)/dashboard/page.tsx` — added funnel to dashboard |

---

## Requirements

- Instagram Business or Creator account (personal accounts don't support insights)
- Meta Developer App with `instagram_business_manage_insights` permission
- Environment variables: `NEXT_PUBLIC_IG_APP_ID`, `IG_APP_SECRET`

## Instagram Graph API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /v22.0/me?fields=...` | Profile info (username, followers, etc.) |
| `GET /v22.0/{user_id}/insights?metric=profile_views,impressions,reach&period=day` | Daily insights for last 30 days |

## Token Lifecycle

- Short-lived token → exchanged for long-lived token (60 days) during OAuth callback
- Token expiry is checked before API calls; expired tokens show "reconnect" prompt
- Future improvement: add a cron job to auto-refresh tokens before expiry
