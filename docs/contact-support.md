# Contact Support

Simple contact form at `/dashboard/contact` that emails the support inbox via Resend.

## Pieces

- **Page** — [src/app/(dashboard)/dashboard/contact/page.tsx](../src/app/(dashboard)/dashboard/contact/page.tsx). Name, Email (prefilled from profile), Subject, Message. Post-submit success state replaces the form with a "Message sent" confirmation and offers a "Send Another" button.
- **API** — [src/app/api/contact/route.ts](../src/app/api/contact/route.ts). Validates all fields, runs a 5-per-10-minutes IP rate limit, attaches userId/teamName when authenticated, and calls the email helper.
- **Email helper** — [src/lib/email.ts](../src/lib/email.ts) `sendContactMessage`. Sends to `SUPPORT_EMAIL` (env, default `support@tappr.me`) from `RESEND_FROM_EMAIL`, with `replyTo` set to the user's email so support can reply directly.
- **Sidebar link** — [src/components/sidebar.tsx](../src/components/sidebar.tsx). New "Contact Support" nav item right after Settings.

## Spam controls

- **Rate limit** — 5 submissions per IP per 10 minutes (in-memory map, cleaned up on interval). Good enough for Hobby scale; swap for Upstash/Redis if we move to multi-region.
- **Honeypot** — a visually-hidden `input name="website"` that real users never touch. Filled submissions return `{ ok: true }` silently so the bot thinks it succeeded.
- **Server-side validation** — name ≤ 100 chars, email regex + ≤ 200 chars, subject ≤ 200 chars, message 10–5000 chars. HTML-escaped before embedding in the email.

## Env

- `RESEND_API_KEY` — required for email to actually go out. If unset, the API returns 500 and the user sees an error toast.
- `RESEND_FROM_EMAIL` — verified sender, defaults to `Tappr Alerts <alerts@tappr.me>`.
- `SUPPORT_EMAIL` — recipient inbox, defaults to `support@tappr.me`.
