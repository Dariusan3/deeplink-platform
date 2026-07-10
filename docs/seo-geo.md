# SEO + GEO setup (tappr.me)

GEO = Generative Engine Optimization: getting cited by AI search engines
(ChatGPT, Perplexity, Gemini, Copilot, Claude). They don't rank pages — they
cite sources.

## Before

Audit found: no `robots.txt`, no `sitemap.xml`, no JSON-LD schema anywhere, no
Open Graph / Twitter tags, no canonicals. Root layout had only a bare `title` +
`description`. `/pricing` had no metadata at all.

## Files added

| File | Purpose |
|---|---|
| `src/lib/seo.ts` | Single source of truth: site constants, FAQ content, schema builders |
| `src/components/seo/json-ld.tsx` | Server component that emits JSON-LD into initial HTML |
| `src/app/robots.ts` | Crawler rules, explicit AI-bot allows, sitemap pointer |
| `src/app/sitemap.ts` | The 4 public pages only |
| `src/app/opengraph-image.tsx` | Dynamically rendered 1200×630 OG card |
| `src/components/landing/Faq.tsx` | Visible FAQ section (7 Q&A) |

## Files changed

- `src/app/layout.tsx` — full metadata: `metadataBase`, title template, keywords,
  canonical, Open Graph, Twitter card, `googleBot` snippet/image directives.
- `src/app/page.tsx` — renders `<Faq />` + Organization, WebSite,
  SoftwareApplication, FAQPage JSON-LD.
- `src/app/pricing/page.tsx` — metadata, canonical, SoftwareApplication schema.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` — canonicals; dropped the
  `— Tappr` suffix so the layout's `| Tappr` template doesn't double the brand.
- `src/app/(dashboard)/layout.tsx`, `src/app/(auth)/layout.tsx`,
  `src/app/admin/layout.tsx` — `robots: { index: false, follow: false }`.

## Key decisions

**FAQ is visible, not schema-only.** Google's structured-data policy requires
`FAQPage` schema to match content the user actually sees. `Faq.tsx` and
`faqSchema()` both read the same `FAQ` array in `src/lib/seo.ts`. Never add a
Q&A to that array without it rendering. Answers use native
`<details>/<summary>` so the text is in the DOM (crawlable) while collapsed,
with zero client JS.

**AI bots are allowed by name.** A bare `User-agent: *` rule is not reliably
honored by every AI crawler. `robots.ts` lists GPTBot, OAI-SearchBot,
ChatGPT-User, PerplexityBot, Perplexity-User, ClaudeBot, Claude-User,
anthropic-ai, Google-Extended, Applebot-Extended, cohere-ai,
meta-externalagent.

**Short links are deliberately NOT blocked in robots.txt.** `/[slug]` lives at
the root, the same namespace as `/pricing`, so no path prefix isolates it —
blocking it would block the site. They are 302 redirects, not HTML, so crawlers
follow them to the destination rather than indexing the short URL. If crawler
hits ever pollute click analytics, filter by user agent inside
`src/app/[slug]/route.ts`, not in robots.

**OG image is generated, not a static asset.** `opengraph-image.tsx` renders it
via `next/og`, so there's no PNG to keep in sync with the brand.

**`partner/layout.tsx` has no noindex metadata** — it's a `"use client"`
component and Next forbids `export const metadata` there. It is still covered by
the `Disallow: /partner/` rule in robots.txt.

## Verified live (dev server)

- `/robots.txt` — 200, all rules present
- `/sitemap.xml` — 200, 4 URLs
- `/opengraph-image` — 200, `image/png`, 48 KB
- `/` — 8 schema nodes: Organization, WebSite, SoftwareApplication, FAQPage,
  7× Question, 7× Answer, Offer, ImageObject. FAQ section in HTML.
- `/pricing` — `<title>Pricing — Free for 500 clicks/month | Tappr</title>`
- `/privacy` — `<title>Privacy Policy | Tappr</title>` (no double brand)
- `/login` — `<meta name="robots" content="noindex, nofollow, nocache">`
- `/dashboard` — 307 to `/login` (gated, nothing to index)
- `npx tsc --noEmit` — clean

## Still to do (needs the operator, not code)

1. **Set `NEXT_PUBLIC_APP_URL=https://tappr.me` in production.** `SITE.url`
   falls back to `https://tappr.me`, but the env var wins — if it's set to a
   preview URL, the sitemap and canonicals will point there.
2. **Submit the sitemap** to Google Search Console and Bing Webmaster Tools.
   Bing indexing is a prerequisite for Copilot citations.
3. **Verify schema** at `https://search.google.com/test/rich-results` and
   `https://validator.schema.org/` once deployed.
4. **Set the real Twitter handle** — `SITE.twitter` is currently `@tappr`,
   a guess. Fix or remove it.
5. **Backlinks.** The largest lever on ChatGPT citation rate that no amount of
   on-page work substitutes for.

## Related
- `docs/analytics-ui-polish.md`
- `docs/analytics-empty-bar-charts-fix.md`
