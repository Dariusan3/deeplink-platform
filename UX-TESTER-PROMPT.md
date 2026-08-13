# Tappr — UX/UI Test Brief

You are testing **tappr.me** with Playwright. You have no access to the source. Everything you need is here.

## 1. What Tappr is

Tappr is a smart deep-link platform: you create short links on `tappr.me/<slug>`, route each visitor to a different destination by country / device / time-of-day, and read click analytics with an AI assistant on top. Audience is creators, affiliates and small agencies who paste links into IG/TikTok bios and ads. It is **live in production with paying users** — treat every click as a real click.

## 2. Rules you do not break

There is **no staging environment**. You are on production against a real database, real payment provider (FanBasis), real email provider (Resend) and real Groq/Instagram API calls.

Never click / never call:

- **`Upgrade`** button on `/dashboard/billing`, and any plan button on `/pricing` (`Start free`, `Get Starter/Growth/Agency`). These POST `/api/billing/checkout` and open a **real FanBasis hosted checkout**.
- **`Cancel`** (red, next to Upgrade) on `/dashboard/billing` — cancels the live subscription at period end.
- **`Delete Account`** on `/dashboard/settings` (bottom, red "Danger" card). The confirm dialog needs you to type `DELETE` — do not type it. It cascades: user, teams, links, clicks, partner earnings. Irreversible.
- **`Send message`** on `/dashboard/contact` — sends a real email to support via Resend.
- **`Request payout`** on `/partner/earnings` — creates a real payout request against real money.
- **`Invite Member`** on `/dashboard/teams` — writes a real membership row on a real user's account. Opening the dialog is fine; do not submit.
- **`Remove`** on any team member row, and **`Delete`** on any collection, link, QR code, API key (`Revoke`) or saved AI chat **that you did not create yourself in this session**.
- Anything under **`/admin`** — you will be redirected away; do not attempt to get in.
- Direct requests to `/api/cron/*`, `/api/webhooks/fanbasis`, `/api/billing/*`, `/api/account/delete`, `/api/partner/payout-request`, `/api/admin/*`. No curl, no `page.request.post`.

Rate-limited but allowed in moderation (each call costs money and quota):

- **`Generate` / `Regenerate`** weekly report on `/dashboard/analytics` — one Groq LLM call. Max 2 total.
- Sending messages in **`/dashboard/brain`** — Groq calls, and the account has a saved-chat cap. Max ~5 messages, and delete only chats you created.
- Visiting a live `tappr.me/<slug>` — every hit logs a click and burns the owner's monthly click quota. Only hit slugs you created.

Everything you create yourself (links, collections, QR codes, chats) you may delete at the end. Clean up.

## 3. Access

- App: `https://tappr.me`
- Login: `https://tappr.me/login`
- Test account: `<<EMAIL>>` / `<<PASSWORD>>`

Login is email + password against Supabase Auth and **is automatable** — no 2FA, no magic link, no captcha on `/login`. The Google button next to it is real OAuth: do not use it.

```js
await page.goto('https://tappr.me/login');
await page.getByPlaceholder(/email/i).fill('<<EMAIL>>');
await page.getByPlaceholder(/password/i).fill('<<PASSWORD>>');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL('**/dashboard');
await page.context().storageState({ path: 'auth.json' });
```

Reuse `auth.json` for all later runs. Session lives in cookies; middleware bounces `/dashboard/*` to `/login` when it expires.

Signup is a separate concern: `/signup` and `/signup/<code>` (partner referral funnel, has hCaptcha). **Do not create accounts.** Load `/signup` visually only, never submit.

## 4. Routes

Test in this order.

| Route | What it is |
|---|---|
| `/dashboard` | Home: stats tiles, click chart, quick-create bar, recent activity, Instagram funnel widget, live anomaly banner. |
| `/dashboard/links` | The core list: search/filter toolbar, link cards, pagination, create/bulk-import/export dialogs, per-link routing rules. |
| `/dashboard/links/[id]` | Single link detail + its analytics. |
| `/dashboard/collections` | Color-coded folders (and sub-folders) grouping links, with click goals. |
| `/dashboard/qr-codes` | Generates and downloads a PNG QR for any existing link. |
| `/dashboard/analytics` | Charts: clicks over time (7D/14D/30D/90D/All), geo, device, browser, referrer, peak hours, AI weekly report. |
| `/dashboard/brain` | AI chat over your link data, with a saved-sessions sidebar. |
| `/dashboard/alerts` | Anomaly inbox: filters, multi-select, dismiss single + bulk. |
| `/dashboard/teams` | Team members, roles (owner/editor/viewer), team switcher lives in the sidebar. |
| `/dashboard/developer` | API key list + interactive REST docs. Not in the sidebar — reach it by URL. |
| `/dashboard/ab-testing` | Intentionally a "Coming Soon" screen. Sidebar item is disabled. Verify it is not reachable/interactive. |
| `/dashboard/billing` | "My Plan": current plan, usage, subscription history. **Read-only for you.** |
| `/dashboard/settings` | Profile, Link Settings / Display Settings tabs, branding toggle, delete-account card. |
| `/dashboard/contact` | Support form. Fill and inspect validation; never submit. |
| `/partner/*` | Affiliate area — `/partner`, `/partner/link`, `/partner/referrals`, `/partner/earnings`, `/partner/promo`, `/partner/settings`. Only renders if the account has `is_partner`; otherwise you are redirected to `/dashboard`. Report which happened. |
| `/` `/pricing` `/privacy` `/terms` | Public marketing + legal. Note: a logged-in user hitting `/` is redirected to `/dashboard` — test these in a fresh incognito context. |
| `/paused` `/not-found` | Visitor-facing states for a deactivated / missing link. Reach directly by URL. |
| `tappr.me/<your-slug>` | The redirect itself. Only your own slugs. |

## 5. End-to-end flows

**A. Create a link and prove the redirect works.**
`/dashboard/links` → `Generate New Link` → title `QA <timestamp>`, destination `https://example.com`, slug `qa-<timestamp>` (or press the generate-slug button) → create → copy the short URL → open `tappr.me/<slug>` in a second page → assert you land on example.com → back on `/dashboard/links`, assert the click count incremented (may need a refresh).

**B. Routing rules.**
Open your link's card menu → rules dialog → add a country rule and a device rule with different destinations → save → reopen the dialog and assert both persisted with the same priority order. Free-plan accounts have routing disabled — if the dialog is locked, report *how* it communicates that.

**C. Collections.**
`/dashboard/collections` → `+ New Collection` (name + color) → create a sub-folder inside it → move/create a link into it → assert the link appears under the collection and the aggregated click count matches → delete both at the end.

**D. Analytics under a real range change.**
`/dashboard/analytics` → switch range 7D → 30D → All → assert every chart re-renders with no stale/empty state and no console error. Then run `Generate` on the weekly report **once**.

**E. Alerts inbox.**
`/dashboard/alerts` → apply each filter → multi-select two alerts → `Clear`/bulk dismiss → assert the unread badge in the sidebar drops by the same number and the rows leave the list without a reload.

**F. Plan-limit honesty.**
On a Free account the limits are: 5 links, 5 collections, 3 QR codes, 1 team member, 10 saved AI chats, 500 clicks/month, no routing, no API, no Instagram. Try to exceed one of them and check the error is specific and names the limit — not a generic toast or a silent failure.

## 6. Look harder here

- **`/partner/*`** — the whole affiliate area was rewritten in the last month (overview, referrals, earnings, settings, mobile layout, the 50% commission rate, the €500 payout threshold). Highest churn = highest bug density.
- **The sidebar** — team switcher, collapsed/expanded state, the alerts badge, the "My Plan" item with its plan pill, the partner CTA. All changed recently. Check collapsed mode tooltips and mobile sheet.
- **Instagram funnel widget on `/dashboard`** — when not connected it renders a "Connect in Settings" link pointing at `/dashboard/settings`. Verify that a matching Instagram section actually exists there; if it does not, that is a P2 dead-end.
- **`/dashboard/alerts` and `/dashboard/brain`** — the two largest, most stateful screens (~1000 lines each). Realtime updates, optimistic writes, streaming responses. Race conditions live here.
- **Long content** — very long URLs and long link/collection titles have overflowed dialogs before. Paste a 300-character URL everywhere a URL input exists.
- **Client-side cache** — navigation reuses a 30s cache. After you create or delete something, navigate away and back and assert the list is not stale.

## 7. Breakpoints and design system

Tailwind defaults, no custom breakpoints: `sm 640 / md 768 / lg 1024 / xl 1280`. **768px is the real hinge** — the sidebar is `hidden md:flex` and becomes a hamburger sheet below it. Test at **390** (mobile), **768** (the seam), **1280** (desktop). Below 360px is not supported; do not report it.

Design tokens (dark UI is the default for the dashboard):

- Brand green `#00D26A`, accent/pulse green `#39FF14`, dashboard background `#000000`.
- Plan colors are deliberate, not inconsistency: free = neutral grey, starter = blue-500, growth = `#00D26A`, agency = amber-500. Destructive = red-400/500.
- Fonts: Geist Sans (UI), Geist Mono (micro-labels, code, uppercase tracking labels).
- Radii scale off one `--radius` var: `sm/md/lg/xl/2xl/3xl/4xl`. Cards are typically `rounded-xl`/`rounded-2xl` with `border-white/5`.
- Uppercase micro-labels at 9–10px with wide tracking are the house style, not a bug.

## 8. Do not report

Preferences ("I'd use a different color"), feature requests, anything you could not reproduce twice, React/Next dev warnings and third-party library console noise, hydration warnings that do not produce a visible defect, sub-360px layout, and the A/B Testing page being unavailable (intentional).

## 9. Report format

One entry per bug, sorted by severity.

```
P0 — data loss, payment/auth broken, page dead
P1 — main flow blocked, no workaround
P2 — flow works but wrong output, broken state, dead link
P3 — visual/copy defect, minor inconsistency

Title:
Route:            /dashboard/...
Viewport:         390 | 768 | 1280
Steps:            1. … 2. … 3. …
Expected:
Actual:
Console:          <verbatim errors during the steps, network 4xx/5xx included>
Screenshot:       <file>
Suspected code:   <file:line if you can infer it from the page source>
```

## 10. Method

For each route, in order:

1. `browser_snapshot` (accessibility tree) before touching anything — it catches missing labels, unlabelled buttons, wrong roles.
2. Screenshot at 390, 768, 1280. Check for horizontal body scroll, clipped text, overlapping elements, off-screen buttons.
3. Then interact: every filter, tab, dropdown, dialog open/close, sort, pagination. Read the console **after each interaction**, not once at the end.
4. Keyboard pass: Tab through the page, confirm focus is visible and order is sane, `Esc` closes dialogs.
5. Reload the page mid-state (filters applied, dialog open) and see what survives.

Work through section 4 top to bottom. Do not skip a route because it "looks fine" in the screenshot — the accessibility snapshot and the console find what the screenshot does not.
