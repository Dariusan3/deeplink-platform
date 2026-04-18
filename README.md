# Tappr - Intelligent Deep Link Management Platform

A full-stack SaaS platform for creating, managing, and analyzing smart deep links with AI-powered analytics, real-time anomaly detection, A/B testing, and multi-platform integrations.

**Built by Osadici Darius**

## Overview

Tappr is a production-grade link management platform that goes beyond simple URL shortening. It combines intelligent routing (geo, device, time-of-day), AI-powered analytics, real-time monitoring, and a complete CRM admin panel into a unified dashboard.

### Key Metrics
- **81** React components
- **18** custom hooks
- **11** API routes
- **10** database migrations
- **12** dashboard pages

## Features

### Smart Link Management
- **Intelligent Routing** - Same link routes visitors to different destinations based on country, device type, time of day, and day of week. Supports combined conditions and priority ordering.
- **Bulk Import/Export** - Upload CSV files with hundreds of URLs, or export full click analytics to CSV with browser, geo, and referrer data.
- **Collections** - Organize links into color-coded groups with click goals and aggregated performance tracking.
- **QR Code Generator** - Dynamic QR codes for any link with customizable styling and PNG download.

### AI-Powered Analytics
- **AI Brain** - Chat interface powered by Groq (LLaMA 3.3 70B) that analyzes your link performance, traffic patterns, and business context to provide actionable insights.
- **Saved Chat Sessions** - Persistent conversation history with plan-based limits (FIFO), auto-save, and auto-title generation.
- **Business Knowledge Base** - Store custom business context (target audience, products, goals) that the AI uses for personalized recommendations.
- **Weekly Intelligence Reports** - AI-generated narrative reports covering executive summary, wins, drops, new audiences, action items, and forecasts.

### Real-Time Anomaly Detection
- **Proactive Monitoring** - Background cron scans all teams on a schedule, detecting traffic spikes/drops (40%+ change) and silent links.
- **AI Root Cause Analysis** - Each anomaly is enriched with AI-generated root cause and recommended action.
- **Supabase Realtime** - Live push notifications to connected clients via Supabase Realtime subscriptions. Alert banners appear on the dashboard without page refresh.
- **Email Alerts** - High-severity anomalies trigger branded HTML email notifications to team owners via Resend.
- **Sidebar Badge** - Unread alert count with pulsing indicator on the navigation.

### A/B Testing
- **50/50 Traffic Split** - Cryptographic random distribution between two variant URLs via a single shared slug.
- **Auto-Optimization** - Automatically selects the winning variant after configurable conversion threshold and percentage lead.
- **Conversion Tracking API** - Public endpoint for tracking conversions with revenue, using atomic SQL increments (no race conditions).
- **ROI Calculator** - Connected to live A/B test data with manual mode toggle for hypothetical scenarios.
- **Rate Limiting** - IP-based rate limiting (30 req/min) on the public conversion endpoint.

### Geo + Device + Time Routing
- **Country-based routing** - Route Romanian users to the RO site, UK users to the UK site, etc.
- **Device detection** - Send mobile users to App Store/Play Store, desktop users to the website.
- **Time-of-day scheduling** - Different destinations for morning vs evening traffic, with overnight range support.
- **Day-of-week rules** - Weekend-specific landing pages or weekday-only campaigns.
- **Date range campaigns** - Time-limited promotions with start/end dates.

### Instagram Integration
- **OAuth2 Flow** - Connect Instagram Business/Creator accounts with long-lived token exchange (60 days).
- **Profile Insights** - Fetch profile views, impressions, and reach via Instagram Graph API v22.0.
- **Funnel Visualization** - Dashboard widget showing IG Profile Views -> Link Clicks with click-through rate calculation.

### Analytics Dashboard
- **Overview Stats** - Total clicks, daily average with trend indicator, top referrer, top location.
- **Link Performance** - Health score (0-100) with circular gauge, growing/declining links, overall trend percentage.
- **Traffic Trends** - Current vs previous period comparison, clicks per link, daily average.
- **Click Activity Chart** - Time series chart with configurable range (7D, 14D, 30D, 90D, All).
- **Browser Breakdown** - Chrome, Safari, Firefox, Edge, Instagram, TikTok, Facebook, etc. parsed from user agents.
- **Peak Traffic Hours** - 24-hour bar chart with peak hour highlighting.
- **Links Created Chart** - 14-day link creation timeline.
- **Geo Breakdown** - Top 10 countries by click volume.
- **Device Breakdown** - Mobile / tablet / desktop distribution.
- **Referrer Sources** - Top traffic sources with click counts.
- **Export Statistics** - Download analytics as CSV.

### Admin CRM Panel (`/admin`)
- **Triple-layer security** - Middleware auth + admin flag check + PIN code gate.
- **Overview Dashboard** - Total users, teams, links, clicks, active subscriptions, plan breakdown.
- **User Management** - Search all users, view their teams and plans, toggle admin status.
- **Subscription Granting** - Assign any plan (Starter/Growth/Agency) for any duration (1-12 months), with free/gifted toggle, notes, and auto-sync to team plan.
- **Subscription History** - Filterable list with expiry tracking, "expiring soon" warnings, and cancellation.

### Affiliate Program
- **Commission Tiers** - 10% (1 referral), 20% (2-5 referrals), 30% (5-10+ referrals).
- **Referral Tracking** - Signup page captures `?ref=` codes, auth callback creates referral records.
- **FIFO Pyramid Leaderboard** - Top 5 positions with rotating queue system.
- **Real-time Updates** - Supabase Realtime subscriptions for instant referral notifications.

### Developer API
- **RESTful API** - Full CRUD for links, statistics, and A/B test conversions.
- **Bearer Token Auth** - SHA-256 hashed API keys with `dl_` prefix, expiry support, usage tracking.
- **Interactive Docs** - Built-in API documentation with code examples.
- **Rate Limiting** - 120 requests per minute for authenticated endpoints.

## Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js 16.1.6 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **Frontend** | React 19.2, Tailwind CSS 4, shadcn/ui, Base UI |
| **Backend** | Next.js API Routes, Supabase (PostgreSQL + RLS + Realtime) |
| **AI** | Groq SDK (LLaMA 3.3 70B, LLaMA 3.1 8B) |
| **Auth** | Supabase Auth (Email, Google OAuth) |
| **Email** | Resend |
| **Animations** | Framer Motion |
| **QR Codes** | qrcode.react |
| **Icons** | Lucide React |
| **Deployment** | Vercel (with Cron Jobs) |
| **Database** | Supabase PostgreSQL with Row Level Security |

## Database Schema

10 migrations managing 15+ tables:

- `users` - User profiles with admin flag
- `teams` - Multi-team support with plan tracking
- `team_members` - Role-based access (owner/editor/viewer)
- `links` - Smart links with redirect rules (JSONB), click goals
- `link_clicks` - Click events with geo, device, user agent, referrer
- `collections` - Link grouping with color and click goals
- `ab_tests` - A/B test configuration with auto-optimization
- `ab_test_events` - Visit and conversion tracking
- `anomaly_alerts` - Persisted anomaly detections with Realtime
- `brain_chats` - AI Brain conversation history
- `business_brain` - Business knowledge entries
- `weekly_reports` - AI-generated weekly reports
- `ig_integrations` - Instagram OAuth tokens
- `subscriptions` - Plan management with auto-sync trigger
- `affiliates` - Affiliate program with pyramid positions
- `affiliate_referrals` - Referral tracking with commission rates
- `api_keys` - Developer API key management

## Project Structure

```
src/
  app/
    (auth)/          # Login, signup, password reset
    (dashboard)/     # All dashboard pages (12 pages)
    admin/           # Admin CRM panel (3 pages)
    api/
      ai/            # AI endpoints (chat, anomaly, weekly report)
      cron/          # Background jobs (anomaly detection)
      ig/            # Instagram OAuth + insights
      v1/            # Public API (links, stats, ab-tests)
      admin/         # Admin API routes
    [slug]/          # Dynamic link redirect handler
  components/
    analytics/       # Chart and breakdown components
    collections/     # Collection management
    dashboard/       # Dashboard widgets (alerts, funnel, chat)
    links/           # Link cards, toolbar, dialogs
    qr/              # QR code generation
    teams/           # Team management
    ui/              # Base UI components (shadcn)
  hooks/             # 18 custom React hooks
  lib/               # Utilities (supabase clients, email, plan limits)
  providers/         # Context providers (user, team)
  types/             # TypeScript types (database, links)
supabase/
  migrations/        # 10 SQL migrations
docs/                # Feature documentation
```

## Getting Started

### Prerequisites
- Node.js >= 20
- Supabase project
- Groq API key (for AI features)

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
NEXT_PUBLIC_IG_APP_ID=
IG_APP_SECRET=
RESEND_API_KEY=
CRON_SECRET=
NEXT_PUBLIC_ADMIN_PIN=
```

### Installation

```bash
git clone https://github.com/Dariusan3/deeplink-platform.git
cd deeplink-platform
npm install
npm run dev
```

### Database Setup

Run all migrations in order via the Supabase SQL Editor or CLI:

```bash
# Migrations are in supabase/migrations/
# 001_initial_schema.sql through 010_admin_can_update_users.sql
```

## Deployment

Deployed on **Vercel** with:
- Automatic deployments from GitHub
- Cron job for anomaly detection (daily)
- Edge-optimized API routes

## Architecture Highlights

- **Row Level Security (RLS)** on all tables - data isolation per team
- **Atomic SQL operations** - no race conditions on counters (RPC functions)
- **Supabase Realtime** - live push for anomaly alerts and affiliate updates
- **Streaming AI responses** - real-time token streaming for chat interface
- **Service role separation** - cron/admin routes use service key, client uses anon key
- **Plan-based feature gating** - brain chat limits, click quotas per pricing tier

## License

Private / Proprietary
