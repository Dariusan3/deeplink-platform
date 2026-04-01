# Admin Dashboard & CRM

**Date:** 2026-04-01

---

## Overview

Full admin panel at `/admin` for managing the platform: view stats, manage users, grant/cancel subscriptions with flexible plan + duration + free toggle.

---

## Access

- **URL:** `/admin`
- **Auth:** Only users with `is_admin = true` in the `users` table can access
- **Your account** (`dariusosadici@gmail.com`) was set as admin in migration 009
- Non-admins are redirected to `/dashboard`

---

## Pages

### 1. Overview (`/admin`)
- Total users, teams, links, clicks
- Active subscriptions count
- Free (gifted) subscriptions count
- Plan breakdown with progress bars
- Recent signups list

### 2. Users & Teams (`/admin/users`)
- Full list of all users with search
- Each user shows: name, email, teams, current plan, admin badge
- **"Grant Plan" button** on each user → opens subscription dialog:
  - Choose plan (Starter / Growth / Agency)
  - Choose duration (1, 3, 6, 12 months)
  - Toggle "Free (gifted)" — no charge
  - Add notes (beta tester, contest winner, etc.)
- Cancel subscription with one click
- Current subscription status shown inline

### 3. Subscriptions (`/admin/subscriptions`)
- Full subscription history with filters: All / Active / Expired / Cancelled
- Shows: team name, plan, status, gifted badge, who granted it, notes
- Days remaining with color coding (>7d green, ≤7d amber, expired red)
- "Expiring soon" warning banner for subs expiring within 7 days
- Cancel button for active subs

---

## Database

### Migration `009_admin_and_subscriptions.sql`

**`users` table** — added `is_admin BOOLEAN DEFAULT false`

**`subscriptions` table:**
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `team_id` | UUID | FK → teams |
| `plan` | TEXT | starter / growth / agency |
| `status` | TEXT | active / cancelled / expired / trial |
| `is_free` | BOOLEAN | Gifted (no payment) |
| `starts_at` | TIMESTAMPTZ | Subscription start |
| `expires_at` | TIMESTAMPTZ | When it expires (null = no expiry) |
| `granted_by` | UUID | FK → users (who granted it) |
| `notes` | TEXT | Admin notes |
| `created_at` | TIMESTAMPTZ | Record creation |

**Auto-sync trigger:** When a subscription is inserted/updated with `status = 'active'`, the team's `plan` field is automatically updated via `sync_team_plan()` trigger.

**RLS:**
- Team members can read their own subscriptions
- Admins can do everything (CRUD)

---

## Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/009_admin_and_subscriptions.sql` | DB schema |
| `src/app/admin/layout.tsx` | Admin layout with sidebar + auth guard |
| `src/app/admin/page.tsx` | Overview stats dashboard |
| `src/app/admin/users/page.tsx` | User management + grant subs |
| `src/app/admin/subscriptions/page.tsx` | Subscription history + filters |
| `src/types/database.ts` | Added `subscriptions` + `is_admin` types |
