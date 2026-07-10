# Landing page audit & fixes

Audit of `src/app/page.tsx` + `src/components/landing/*`.

## 1. Fabricated statistics — removed

`ProofStrip.tsx` publicly claimed **1.4B+ clicks routed · 312M bots blocked ·
99.99% uptime · 38 edge nodes**. The production database has **6,158 total
clicks across 67 links**. Nothing backed those numbers. The nav rendered a
**"v0.4 — Beta"** badge one row above them, contradicting the claim in the same
viewport.

`Footer.tsx` restated the same claim in prose: *"Built at the edge, in 38
cities."*

`FinalCta.tsx` claimed **"SOC 2 Type II in progress"** — a compliance assertion
with no evidence in the repo of an audit being under way.

Why this mattered more after the SEO work: the landing page now emits
`Organization`, `SoftwareApplication`, and `FAQPage` JSON-LD (see
`docs/seo-geo.md`). AI search engines cite the page as fact, so the claims were
being amplified, not merely displayed. Unverifiable commercial claims fall under
the EU Unfair Commercial Practices Directive.

**Fix:** `ProofStrip` is now a *capability* strip, not a metrics strip. Every
entry maps to shipped behavior:

| Label | Backed by |
|---|---|
| ROUTING — GEO · DEVICE · TIME | `src/app/[slug]/route.ts` |
| BOT DETECTION — REAL-TIME | user-agent + referrer-concentration checks |
| FREE TIER — 500 CLICKS / MO | the Free plan in `Pricing.tsx` |
| API — REST | `/api/v1/links`, keys in developer settings |
| A/B TESTING — BUILT IN | `/dashboard/ab-testing` |

Rule going forward: **do not add a number to the landing page that cannot be
pointed at in the codebase or a dashboard you can screenshot.**

The SOC 2 line became `Cancel anytime · Export your data anytime · No credit
card required`. Put SOC 2 back only once the audit has actually started.

## 2. Dead links — fixed

The hero's **"See how it works"** button pointed at `#how`. No element with that
id existed, so the button silently did nothing.

| Location | Link | Was |
|---|---|---|
| Hero | `#how` | anchor did not exist |
| Nav | `/changelog` | 404 |
| Nav | `/docs` | 404 |
| Footer | `/changelog`, `/docs`, `/security` | 404 |
| Footer | `/compare/bitly`, `/compare/linktree` | 404 |
| Footer | `https://status.tappr.me` | no DNS |
| Footer | `/dashboard/contact` | 307 to `/login` — a public "Contact" link forced a signup |

**Fix:** `HowItWorks.tsx` created and owns `#how`. Nav now links only resolving
anchors (`#product`, `#how`, `#pricing`, `#api`, `#faq`). Footer rebuilt with
working links; Contact is a `mailto:hello@tappr.me`. Every removal is commented
in place with the condition for re-adding it.

## 3. New section: How it works (`#how`)

Three numbered, answer-first steps (create link → add routing rules → read what
happened). Sits between `Problem` and `ProductBento`. Doubles as GEO content —
numbered step structures are what generative engines extract and cite most
reliably.

## Verified

- `npx tsc --noEmit` — clean
- Rendered HTML: zero `1.4B` / `312M` / `99.99` / `EDGE NODES` / `BOTS BLOCKED`
  / `CLICKS ROUTED` / `38 cities` / `SOC 2`
- Rendered HTML: zero links to `/changelog`, `/docs`, `/security`, `/compare/*`,
  `/dashboard/contact`
- Every anchor resolves: `#product`, `#how`, `#pricing`, `#api`, `#faq`,
  `#ai-brain`

## 4. Competitor claims — reframed

The hero read: *"Bitly says 2,400 clicks. It doesn't say 1,800 were bots."*

Comparative advertising is legal in the EU (Directive 2006/114/EC) when it
compares objectively verifiable features, is not misleading, and does not
discredit. That headline failed on all three: it asserted as fact that a named
competitor's reported traffic is ~75% bots. Nobody measured that. Same
fabrication class as the `1.4B clicks routed` stat, but worse — it is a factual
claim about **someone else's product**, which moves it from comparison into
disparagement, alongside trademark use in a headline.

Worst placement: `src/lib/seo.ts` carried the same numbers inside the FAQ
answer, and that text is emitted as `FAQPage` JSON-LD. AI search engines cite it
**as fact about Bitly**.

**Rule:** naming a competitor is fine. Asserting facts about their product is
not. Say only what Tappr does.

| File | Was | Now |
|---|---|---|
| `Hero.tsx` | "Bitly says 2,400 clicks. It doesn't say 1,800 were bots." | "You got 2,400 clicks. Tappr tells you how many were real." |
| `opengraph-image.tsx` | same line | same new line |
| `Problem.tsx` | "Three things Bitly doesn't tell you…" | "Three things your link shortener won't tell you…" |
| `lib/seo.ts` FAQ answer | asserted Bitly's behavior + invented ratio | describes only Tappr; ends "…evaluate Tappr as a Bitly alternative" |
| `partner/promo/page.tsx` | "kinda like Bitly on steroids" | describes Tappr on its own terms |

**Deliberately kept:**
- `"Bitly alternative"` keyword in `layout.tsx` — standard, legal, high-intent.
- The FAQ *question* "How is Tappr different from Bitly?" — a real search query
  and a strong GEO surface. Only the answer was rewritten.
- `Founder.tsx` — "We tried Bitly. We tried Linktree." First-person experience,
  lowest risk, and it is the genuine origin story.

The hero subtitle previously opened with "Tappr does." — a callback to the old
headline. Removed, since the headline now names Tappr directly.

## Not done

1. **Paid CTAs still go nowhere.** `Pricing.tsx` sets `href="/pricing"` on
   "Try Starter" and "Try Growth". `Pricing` renders on both `/` and `/pricing`,
   so on `/pricing` those buttons are self-links. `/api/billing/checkout` exists
   but no component calls it for paid plans — only `free-plan-button.tsx`.
   **This is the only payment path on the site and it is a dead end.**
2. **Footer socials unverified.** `x.com/tappr` and `github.com/tappr` return
   200, but X and GitHub return 200 for handles that are not yours.
   `linkedin.com/company/tappr` returns 999 (bot block). Confirm all three are
   your accounts. Same for `SITE.twitter` in `src/lib/seo.ts`.
3. **No real social proof** — no testimonials, customer logos, or product
   screenshots. `LiveRouter` in the hero is the strongest asset and appears
   nowhere else.

## Related
- `docs/seo-geo.md`
