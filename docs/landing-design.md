# Landing Page — Design Constraints

The Vercel-style landing at [src/app/page.tsx](../src/app/page.tsx) follows a strict set of design rules. Don't relax them when iterating; the discipline IS the look.

## Hard rules

1. **One accent color** — `#00D26A` (the green). Reserved for: live indicators, the active routing rule, the Growth pricing tier highlight, payoff words in headlines, the final-CTA radial glow, and primary action accents on green CTAs. No other accent colors anywhere.
2. **No italics. No serifs.** Emphasis comes from `font-light` (Geist 300) in muted gray (`--ink-2`), never from style switching.
3. **Hairline borders only** — every border is `1px solid var(--line)` (`#1a1a1a`). Hover hairlines bump to `--line-2` (`#262626`). No glass cards, no shadows behind inner cells.
4. **Flat outer borders, hairline inner dividers** on grids — bento, problem, pricing all share `gap-px bg-[var(--line)] border border-[var(--line)]` so the dividers are exactly 1px.
5. **Two gradients only** — the hero behind the live router (`.hero-glow`) and the FinalCta top + bottom radials. Nowhere else.
6. **Motion budget** — reveal-on-scroll (one-shot), live dot pulse (1.6s), hero glow drift (8s), button lift (250ms). All gated by `prefers-reduced-motion`.

## Tokens

Set on `.landing-root` so the dashboard's existing tokens stay untouched:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#000000` | Canvas |
| `--surface` | `#0a0a0a` | Live router body, inner cells when needed |
| `--line` | `#1a1a1a` | Default hairline |
| `--line-2` | `#262626` | Hover hairline |
| `--ink` | `#ededed` | Primary text |
| `--ink-2` | `#a1a1a1` | Muted display text (the "It doesn't say" half of headlines) |
| `--muted` | `#737373` | Microlabels, mono meta |
| `--tappr-green` | `#00D26A` | Single accent |
| `--green-soft` | `rgba(0, 210, 106, 0.12)` | Subtle green tint behind active rows / pills |
| `--green-glow` | `rgba(0, 210, 106, 0.33)` | Hero radial + active row outer glow |

## Type system

- **H1**: Geist 600, `clamp(48px, 8vw, 116px)`, line-height `0.92`, letter-spacing `-0.05em`
- **H2**: Geist 600, `clamp(36px, 5vw, 64px)`, line-height `0.98`, letter-spacing `-0.04em`
- **Microlabels** (`.ulabel`): Geist Mono 500, 11px, uppercase, ls `0.14em`, color `--muted`. Prefixed with a 14px green hairline via `::before`.
- **Numbered cells**: mono `/01`, `/02`, `/03` in `--muted`.

## Component map

| Section | File | Role |
|---|---|---|
| Nav | [Nav.tsx](../src/components/landing/Nav.tsx) | Sticky 60px, blur, hairline bottom |
| Hero (copy) | [Hero.tsx](../src/components/landing/Hero.tsx) | Strikethrough headline + CTAs |
| Live Router | [LiveRouter.tsx](../src/components/landing/LiveRouter.tsx) | Client. Auto-cycles every 2.4s, click pauses 8s |
| Proof Strip | [ProofStrip.tsx](../src/components/landing/ProofStrip.tsx) | Mono stats row |
| Problem | [Problem.tsx](../src/components/landing/Problem.tsx) | 3-cell grid with hairline dividers + dashed-top fix line |
| Product Bento | [ProductBento.tsx](../src/components/landing/ProductBento.tsx) | 6-col grid with /01–/05 cells |
| Founder | [Founder.tsx](../src/components/landing/Founder.tsx) | Left meta column, right 3 paragraphs |
| Pricing | [Pricing.tsx](../src/components/landing/Pricing.tsx) | 3 tiers with Growth highlighted |
| Final CTA | [FinalCta.tsx](../src/components/landing/FinalCta.tsx) | 160px vertical padding, top + bottom radials |
| Footer | [Footer.tsx](../src/components/landing/Footer.tsx) | 4-col grid, mono bottom strip with social squares |

`Reveal.tsx` wraps each block with an IntersectionObserver that adds `.in` once when scrolled into view. Stagger via `delay` prop in 60ms increments.

## Iteration playbook

- **A/B testing the hero headline** — change copy in `Hero.tsx`, keep the strikethrough + muted-gray-then-green pattern. Don't introduce new colors or weights.
- **Adding a new bento cell** — extend the bento grid in `ProductBento.tsx`. Use the same `/0N` mono number + Reveal stagger pattern. Don't round inner corners.
- **New section between Pricing and FinalCta** — match the section pattern: `border-b border-[var(--line)]`, `py-24 lg:py-32`, microlabel + H2, content. No exceptions.
- **Sales / urgency banners** — don't. Tappr's positioning is "calm power user". A countdown timer kills it.

## Things deliberately not built

- No customer logos / "Trusted by" — replaced by founder note since there's no real social proof yet
- No video background — kills mobile, and the live router IS the demo
- No carousel / autoplay slideshow
- No multiple CTAs per section — one primary + one ghost max

## Partner referral capture

`<ReferralTracker />` is mounted at the very top inside a `<Suspense>` so the partner program's `?ref=<code>` capture still works. Don't remove it.
