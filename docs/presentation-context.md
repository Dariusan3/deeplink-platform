# Tappr — Context Brief for Presentation (PPTX)

> **How to use this document:** paste it whole into the AI that will build the slide deck.
> Everything below is extracted from the real production codebase and the live landing page
> (tappr.me). Section 9 lists what is **NOT** true — do not invent metrics, logos, or
> testimonials beyond it.

---

## 1. One-liner

**Tappr — Smart Link Management with AI Traffic Analytics.**

> "Smart routing, bot detection, and an AI that explains your traffic."

Official description (from `src/lib/seo.ts`):

> Tappr is a link management platform that routes clicks by geo, device, and time, flags bot
> traffic in real time, and uses AI to explain what's driving your numbers. Free for 500
> clicks/month.

Positioning line used across the site:

> "Smart links for people who can't afford guessing."

Domain: **tappr.me** · Contact: hello@tappr.me · Status: **v0.4 — Beta** · Company: Tappr Labs
(Bucharest & Brooklyn)

---

## 2. The problem (this is the emotional core of the deck)

Headline used on the site: **"Three things your link shortener won't tell you about your traffic."**

1. **Your top link just died and you don't know.**
   The Instagram post that drove 70% of your traffic got deleted. Hours pass before you check
   analytics. → *Tappr alerts you in under an hour, with the likely cause.*

2. **Half your "viral" traffic is bots.**
   One referrer pumping 1,800 fake clicks looks great on a dashboard — until you check
   conversions. → *Tappr flags single-source concentration before the ad bill comes.*

3. **You'll miss your goal — and it's too late to fix it.**
   Day 25 of 30, you're 60% behind, too late to course-correct. → *Tappr forecasts the miss at
   day 15 and tells you what's slowing you down.*

**Founder origin story (verbatim, good for a "why we built this" slide):**

> We tried Bitly. It told us a campaign got clicks — not which clicks were bots, not why a link
> suddenly died, not which post we should reshare.
>
> We tried Linktree. It looks fine on a phone. It's not built for routing. It's not built for
> analysis. And it's definitely not built for anyone running paid campaigns or A/B tests.
>
> So we built Tappr — for the people who actually depend on links working, knowing why they
> work, and reacting fast when they don't.

---

## 3. The hero message

**H1:** "You got 2,400 clicks. Tappr tells you how many were real."

**Sub:** "Smart routing, real-time anomaly alerts, and an AI that explains your traffic — for
creators & marketers who can't afford guessing."

**The signature visual/metaphor of the whole brand:**
`2,400 clicks → 600 real · 1,800 bots`

**CTAs:** "Start free — no card" · trust bullets: *No credit card · 500 clicks/mo, free forever ·
Up in 60 seconds.*

---

## 4. Who it helps (audience)

| Segment | Their pain | Plan they land on |
|---|---|---|
| **Creators** (Instagram, TikTok, YouTube) | Link-in-bio dies silently; can't tell real fans from bot traffic | Free / Starter |
| **Solo entrepreneurs & marketers** | Running paid campaigns, can't afford to pay for fake clicks | Starter (€97) |
| **Businesses scaling** | Need geo/device/time routing, custom domain, API, team roles | Growth (€297) |
| **Agencies** | Many client campaigns, high volume, need unlimited seats + priority support | Agency (€997) |
| **Developers** | Need programmatic link creation with routing rules | Growth+ (REST API) |

Segment taglines already written for each plan:
- Free — "For testing the routing engine and personal links."
- Starter — "For solo entrepreneurs who want to start smart."
- Growth — "For businesses that scale and want full control."
- Agency — "For agencies running client campaigns at volume."

---

## 5. How it works (3 steps — ideal for one slide)

1. **Create the link** — paste destination, pick a slug, get `tappr.me/<slug>` instantly. Zero
   configuration to start.
2. **Add routing rules** — point the same link at different destinations by country, device,
   time of day, day of week, or date range. Rules evaluate top to bottom; first match wins.
   Example: `if country=US ∧ device=mobile → App Store`
3. **Read what actually happened** — every click is classified *before* it redirects. Bots are
   flagged, anomalies raise alerts within the hour, and the AI Brain explains shifts in plain
   English.

**Live routing example (great as a visual):** one link `tappr.me/promo`
- 🇺🇸 US · Desktop · via twitter.com → App Store (apps.apple.com)
- 🇷🇴 RO · Mobile · via instagram.com/bio → Localized shop (ro.ourshop.com)
- 📱 TikTok in-app webview → WhatsApp fallback (wa.me/40700000000)

---

## 6. The product — 5 pillars

**Site headline:** "Built for the way you actually distribute links."

### 6.1 Smart Routing — "One link. Every context."
Rules by **country, device, time of day, day of week, date range**, with combined conditions and
priority ordering. Mobile US → App Store. Desktop Romania → localized site. Saturday traffic →
weekend landing page. All from a single slug. Also: automatic **deep linking** (opens the native
app on mobile, 100+ apps supported).

### 6.2 AI Brain — chat with your analytics
Powered by Groq (LLaMA 3.3 70B). You ask in plain English, it answers with cause + action.
Real example of its output:

> **› why did /promo lose traffic?**
> Down 67% in 12h. Last week 84% of clicks came from instagram.com/p/abc — that referrer dropped
> to zero today. Likely cause: the post was deleted.
> → DM the account or pivot /promo to a TikTok-first strategy.

Also includes: persistent chat history, a **Business Knowledge Base** (you store your audience,
products, goals so the AI personalizes advice), and **AI weekly intelligence reports** (executive
summary, wins, drops, new audiences, action items, forecasts).

### 6.3 Real-Time Anomaly Alerts
A background job continuously scans all accounts and detects **traffic spikes, traffic drops
(40%+ change), silent/dead links, bot patterns, and click fraud** — **12 alert types** total.
Each anomaly is enriched with an **AI-generated root cause and a recommended action**. Alerts
push live to the dashboard (no refresh) and high-severity ones send email.

Example alert:
> **SPIKE — /launch — 6× normal.** 412 clicks in the last 60 minutes vs an average of 68/hour.
> Something's working — push budget while it's hot.

### 6.4 A/B Testing — "Test variants. Auto-pick the winner."
50/50 cryptographic traffic split behind one shared slug. Conversion + revenue tracking via a
public API. **Auto-optimization**: after a configurable threshold, the winner is automatically
routed 100% of traffic. Built-in ROI calculator connected to live test data.
> A/landing-v1 → 7.4% · B/landing-v2 → 4.1% · ★ winner auto-routed to 100%

### 6.5 Developer API
REST API, Bearer token auth, full smart-routing support, rate-limited, interactive docs.
```
POST https://tappr.me/api/v1/links
Authorization: Bearer dl_xxx
{ "destination_url": "https://shop.io", "slug": "promo", "redirect_rules": [...] }
```

### Supporting features (secondary slides / feature grid)
- **Analytics dashboard** — clicks over time, geo by country, device & browser breakdown,
  referrer sources, peak traffic hours, per-link health score (0–100), CSV export.
- **Collections** — organize links into color-coded groups with click goals.
- **Dynamic QR codes** — for any link, customizable, PNG download.
- **Instagram integration** — OAuth connect, profile insights, and a funnel widget showing
  *IG Profile Views → Link Clicks* with click-through rate.
- **Teams** — role-based access (owner · editor · analyst · viewer).
- **Bulk import/export** — CSV upload of hundreds of URLs.
- **Affiliate program** — 10% / 20% / 30% commission tiers by referral count, with a live
  leaderboard.
- **Admin CRM panel** — internal user/subscription management with triple-layer security.

---

## 7. Pricing

**Site headline:** "Start free. Upgrade when you outgrow it."

| | **Free** | **Starter** | **Growth** ★ Most Popular | **Agency** |
|---|---|---|---|---|
| **Price** | €0 forever | €97 / month | €297 / month | €997 / month |
| Clicks / month | 500 | 50,000 | 250,000 | Unlimited |
| Links | 25 | 500 | 5,000 | Unlimited |
| Team members | 1 | 3 | 10 | Unlimited |
| Automatic deep linking (100+ apps) | ✓ | ✓ | ✓ | ✓ |
| Smart routing | — | Geo + Device | Geo · Device · Time · Days | Geo · Device · Time · Days |
| Traffic rotator / split testing | — | ✓ | ✓ | ✓ |
| AI Brain | 10 chats/mo | Unlimited | Unlimited | Unlimited |
| Anomaly alerts | Basic | All 12 types | All 12 types | All 12 types |
| AI weekly report | — | ✓ | ✓ | ✓ |
| Email alerts | — | ✓ | ✓ | ✓ |
| Real-time analytics (geo·device·referrer) | ✓ | ✓ | ✓ | ✓ |
| Role-based access | — | ✓ | ✓ | ✓ |
| Collections | 5 | Unlimited | Unlimited | Unlimited |
| Dynamic QR codes | 3 | 25 | 250 | Unlimited |
| Remove Tappr branding | — | — | ✓ | ✓ |
| Custom domain | — | — | ✓ | ✓ |
| Instagram integration | — | ✓ | ✓ | ✓ |
| Developer API + keys | — | — | ✓ | ✓ |
| Support | Community | Email | Priority email | Priority · 4h response |

Billing: charged every 30 days via FanBasis. Cancel anytime, export your data anytime.

**Note:** the Free plan is currently **invite-only** — unlocked with a partner code from a Tappr
partner (this is a deliberate growth/partner mechanic, not a bug). Public marketing copy still
says "start free, no card."

---

## 8. Differentiation — Tappr vs. the alternatives

| | Bitly / classic shorteners | Linktree | **Tappr** |
|---|---|---|---|
| Click counting | One combined total | Basic | **Bots separated from real humans, classified before the redirect** |
| Routing | Static, one destination | Static page | **Conditional: geo · device · time · day · date range** |
| Knowing *why* traffic changed | You dig through charts | — | **AI Brain explains it in plain English** |
| Reacting when a link dies | You find out eventually | — | **Real-time alert within the hour + root cause** |
| Optimization | Manual | — | **A/B test with automatic winner routing** |

Core competitive claim: **every other tool tells you *how many* clicks. Tappr tells you *which
clicks were real, why the number changed, and what to do about it*.**

Tappr's own positioning keyword: *"Bitly alternative"* — for teams where a raw click count has
stopped being enough.

---

## 9. ⚠️ Guardrails — do NOT put these on a slide

Tappr is an early-stage product (**v0.4 Beta**). Honesty is part of the pitch. **Do not
fabricate:**

- ❌ **No testimonials, no customer logos, no "Trusted by" section.** None exist.
- ❌ **No traction numbers like "1.4B clicks routed" or "312M bots blocked."** Those were mockup
  placeholders and were deliberately removed from the site. Real production numbers today are
  small (thousands of clicks, tens of links) — the deck should sell the *problem and the
  mechanism*, not scale.
- ❌ **No uptime/SLA/SOC-2 claims.** Not certified.
- ❌ **No fake case studies.**

✅ **What IS legitimate to show:** the problem, the product mechanics, the live routing demo, the
AI Brain output examples, the alert examples, the pricing, the roadmap, the founder story.

---

## 10. Suggested slide flow for the deck

1. **Title** — Tappr · "Smart links for people who can't afford guessing."
2. **The hook** — "You got 2,400 clicks. How many were real?" (600 real / 1,800 bots)
3. **The problem** — the three things your link shortener won't tell you.
4. **Why we built it** — the Bitly/Linktree founder story.
5. **What Tappr is** — the one-liner + 3-step "how it works."
6. **Pillar 1 — Smart Routing** (the one-link-many-destinations visual).
7. **Pillar 2 — AI Brain** (show the real "/promo lost traffic" answer).
8. **Pillar 3 — Real-Time Alerts** (show the SPIKE /launch alert).
9. **Pillar 4 — A/B Testing with auto-winner.**
10. **Pillar 5 — Developer API** (the curl snippet).
11. **Who it's for** — creators · marketers · businesses · agencies.
12. **Competitive slide** — Tappr vs Bitly vs Linktree table.
13. **Pricing** — Free → Starter → Growth → Agency.
14. **Ask / CTA** — "Start free — no card. Up in 60 seconds." · tappr.me

---

## 11. Tone & visual direction

- **Tone:** blunt, technical, anti-fluff. Short declarative sentences. No corporate marketing
  speak. The brand's own voice: *"for people who can't afford guessing."*
- **Visual language on the live site:** dark background, monospace technical accents, a single
  **green** accent color used for the payoff word in each headline (e.g. "…how many were
  **real**."), numbered sections (`/01`, `/02`, `/03`), code/terminal-style blocks.
- **Recommended deck aesthetic:** dark theme, green accent, monospace for data/code, generous
  whitespace, one idea per slide.
- **Tech stack (if a technical slide is needed):** Next.js 16 · React 19 · TypeScript ·
  Supabase (PostgreSQL + Row Level Security + Realtime) · Groq (LLaMA 3.3 70B) · Resend ·
  deployed on Vercel with cron jobs.
