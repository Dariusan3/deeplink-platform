# Real-Time Anomaly Detection

**Date:** 2026-03-31

---

## Overview

Upgraded anomaly detection from on-demand (user visits Alerts page) to a **fully proactive real-time system**:
- Background cron scans all teams every 15 minutes
- Anomalies persisted in database with Supabase Realtime broadcasting
- Dashboard shows live alert banner without page refresh
- Sidebar shows unread alert count badge (pulsing red)
- High-severity anomalies trigger email to team owners via Resend

---

## Architecture

```
[Vercel Cron - every 15min]
        │
        ▼
[/api/cron/anomaly-check]  ← scans ALL teams
        │
        ├──► Detect traffic drops/spikes (40%+ change in 2h windows)
        ├──► Detect "Link Gone Silent" (0 clicks vs 5+/2h avg)
        ├──► AI enhancement via Groq (root cause + action)
        ├──► Deduplicate (skip if same alert exists in last 4h)
        ├──► INSERT into anomaly_alerts table
        │         │
        │         ├──► Supabase Realtime broadcast to connected clients
        │         │         │
        │         │         ▼
        │         │    [Dashboard] ← live alert banner appears
        │         │    [Sidebar]   ← badge count updates
        │         │
        │         └──► [Alerts Page] ← full alert history
        │
        └──► Send email via Resend (HIGH severity only → team owners)
```

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/006_anomaly_alerts.sql` | `anomaly_alerts` table with Realtime enabled |
| `src/app/api/cron/anomaly-check/route.ts` | Background cron endpoint (scans all teams) |
| `src/hooks/use-anomaly-alerts.ts` | Client hook with Supabase Realtime subscription |
| `src/components/dashboard/realtime-alerts.tsx` | Dashboard live alert banner (top 3 unread) |
| `src/lib/email.ts` | Resend email utility with branded HTML template |
| `vercel.json` | Cron config (every 15 minutes) |

## Files Modified

| File | Change |
|---|---|
| `src/types/database.ts` | Added `anomaly_alerts` table type |
| `src/components/sidebar.tsx` | Added unread count badge on Alerts nav item |
| `src/app/(dashboard)/dashboard/page.tsx` | Added `<RealtimeAlerts />` banner |

---

## Database Schema: `anomaly_alerts`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK to teams |
| `severity` | TEXT | `low`, `medium`, `high` |
| `title` | TEXT | Alert headline |
| `description` | TEXT | Detailed description |
| `root_cause` | TEXT | AI-generated root cause (nullable) |
| `action` | TEXT | AI-recommended action (nullable) |
| `affected_link` | TEXT | Link slug if applicable |
| `change_percent` | NUMERIC | Traffic change % |
| `is_read` | BOOLEAN | Marked as read by user |
| `is_dismissed` | BOOLEAN | Dismissed from view |
| `emailed` | BOOLEAN | Email sent flag |
| `created_at` | TIMESTAMPTZ | Detection timestamp |

Realtime is enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.anomaly_alerts`.

---

## Detection Rules

| Rule | Threshold | Severity |
|---|---|---|
| Traffic Spike | +40% to +69% in 2h | Medium |
| Traffic Spike | +70%+ in 2h | High |
| Traffic Drop | -40% to -69% in 2h | Medium |
| Traffic Drop | -70%+ in 2h | High |
| Link Gone Silent | 0 clicks in 2h, avg >5/2h over 7d | Medium |

## Deduplication

Same `team_id + title` combination won't be inserted if one already exists within the last 4 hours.

---

## Email Notifications

- **Trigger:** Only `high` severity anomalies
- **Recipients:** Team owners (role = `owner`)
- **Provider:** Resend
- **Template:** Branded HTML with severity badge, description, root cause, action, and dashboard CTA

### Environment Variables Required

```
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=Tappr Alerts <alerts@tappr.me>  # optional, has default
CRON_SECRET=your-secret-here  # protects cron endpoint from unauthorized access
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # required for cron (bypasses RLS)
```

---

## Cron Configuration

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/anomaly-check",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Runs every 15 minutes. Protected by `CRON_SECRET` bearer token (Vercel automatically sends this for its own crons).

---

## Client-Side Real-Time Flow

1. `useAnomalyAlerts` hook subscribes to Supabase Realtime channel `anomaly_alerts_{teamId}`
2. On `INSERT` event, new alert is prepended to local state — no page refresh needed
3. `RealtimeAlerts` component on dashboard shows top 3 unread alerts
4. Sidebar badge shows unread count with pulsing red indicator
5. User can dismiss/mark as read from dashboard or Alerts page
