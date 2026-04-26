# Tappr — Design Brief for Logo

Context for the designer creating the Tappr logo. All information gathered from the actual product's current visual language.

---

## 1. Brand name

**Tappr** — short for "tapper" (as in tap-to-go). Canonical domain: **tappr.me**.

Product is a smart link-management platform — users shorten URLs and get analytics, AI insights, and automatic routing based on visitor context (country, device, time).

The name suggests:
- **Speed** — one tap and you're redirected
- **Precision** — the right destination, tapped into exactly
- **Modern / mobile-first** — "tap" as in touch/mobile interaction

---

## 2. Product personality

The current UI reads as **dark, tech-forward, slightly underground**:

- Black backgrounds, glassmorphism cards with subtle borders
- Bright neon-green accents that feel like "alive / online / detecting"
- Typography that's heavy, wide, and confident (`font-black`, uppercase microlabels)
- Micro-animations with pulse + glow effects
- Subtle cyberpunk / trading-terminal aesthetic without going cringe

Target user: creators, marketers, devs who care about where their traffic goes and want granular control. Not enterprise/corporate — more "power tool for the savvy".

---

## 3. Color palette (from production code)

### Primary

| Color | Hex | Use |
|---|---|---|
| **Tappr Green** | `#00D26A` | Primary brand color. Used 764× in the codebase. Buttons, primary text accents, "live / active" indicators, the "ppr" in the wordmark. |
| **Electric Lime** | `#39FF14` | Accent / hero moment. "Live" status, neon glows, attention-grabbers. Used sparingly — it's the highlight color. |

### Neutrals (dark mode — primary theme)

| Color | Hex | Use |
|---|---|---|
| True Black | `#000000` | Backgrounds |
| Near-black | `#0a0a0a` | Cards, popovers |
| White | `#FFFFFF` | Primary text |

### Support

| Color | Hex | Use |
|---|---|---|
| Warning amber | `#F59E0B` | Medium-severity alerts, cautions |
| Error red | `#EF4444` | Destructive actions, high-severity alerts |
| Purple accent | `#A855F7` | A/B test "Variant B", secondary highlights |

### Light mode (exists but secondary)

White background with near-black text. The product is dark-first.

---

## 4. Typography

- **Primary font:** Geist Sans (variable; `font-sans` in Tailwind)
- **Mono font:** Geist Mono (for short URLs, API keys, technical readouts)
- **Weights in active use:** 400 (body), 700 (bold), **900 (black — dominant)**
- **Microlabels** are always uppercase with very wide tracking (~0.2em / `tracking-widest`), font-black, tiny size (9-11px). Gives a "control-panel / HUD" feel.

**Logo should work with Geist as an accompanying wordmark** but the logomark itself can use its own typography.

---

## 5. Current "logo" state (what exists now, what needs replacing)

The product currently uses **two different icons** representing the brand — this is an inconsistency the designer can fix.

### A. Sidebar / login / emails — **chain-link icon**

Uses a Lucide-style "two interlocking chain links" icon (the generic link SVG) inside a rounded-xl container with green background tint + soft green glow.

```
Wordmark: "Ta" white + "ppr" green — `Ta[green:ppr]`
Weight: font-black (900), tight tracking (tracking-tighter)
```

### B. Landing page "Tappr detection" hero — **lightning bolt (⚡)**

On the marketing landing at `src/app/page.tsx`, the "Tappr detects device & app" step uses a **lightning bolt** icon in a pulsing green circle. This feels more authentic to the name ("tap = instant action") than the chain link does.

### What the designer should decide

Pick ONE primary mark. Candidates, ranked by how well they fit the name:

1. **Lightning / tap gesture** — matches "Tappr" literally; feels instant + electric. Pairs with the neon green.
2. **Arrow / redirect glyph** — matches the function (routing).
3. **Finger-tap circle / ripple** — literal "tap" interpretation.
4. **Chain link** — safe, generic link-tool symbol. Currently used but least distinctive.

My recommendation to hand over: **the lightning bolt direction** is already in the brand (on the landing page) and fits the product personality best.

---

## 6. Wordmark pattern (keep this)

Whatever the mark, the wordmark should keep this split-color treatment as it's established:

```
Ta  (white)   +   ppr  (#00D26A green)
```

Heavy weight (900). This exact pattern is used in the sidebar header, email templates, and login screens — the designer can either refine it or use it verbatim.

---

## 7. Visual language the logo should sit inside

When designing, the logo will live alongside:

- **Glass-cards** — semi-transparent dark panels with 1px `rgba(255,255,255,0.05)` borders, `backdrop-blur`, rounded-2xl corners.
- **Soft green glows** — `shadow-[0_0_20px_rgba(0,210,106,0.1)]` around active elements. The logo should look good with or without a glow behind it.
- **Pulsing green dots** — `#39FF14` dots with animated `box-shadow` indicate "live" status. The logo mark could incorporate or echo this.
- **Generous rounded corners** — base `--radius: 20px`. Everything is soft and round, not sharp-cornered.
- **Bright green on pure black** is the iconic pairing — make sure the logo sings in that exact combo.

---

## 8. Where the logo will be used (sizes + contexts)

The designer needs to deliver the mark in all these forms:

| Context | Size | Background | Notes |
|---|---|---|---|
| Favicon | 32×32, 16×16 | Any | Mark only, must read at tiny sizes |
| App icon (PWA / iOS) | 512×512, 180×180 | Dark or transparent | Rounded-square container |
| Sidebar header | ~40×40 mark + wordmark | Dark (`#000`) | Currently in a green-tinted rounded box |
| Email header | ~20px tall wordmark | Dark (`#000`) | Resend HTML emails — vector/SVG inline |
| Marketing site nav | ~24px tall wordmark | Dark | Landing page top |
| OG / social share | 1200×630 | Any | For link previews — mark + wordmark + tagline |
| Loading screen / splash | Full-bleed | Dark | Mark centered with glow |
| Light mode | All sizes | White (`#FFFFFF`) | Must have a variant that reads on white |

**Deliver as SVG** (resizable, inline-able in HTML emails and the app).

---

## 9. Constraints + don'ts

- **Don't** use photo-realistic or gradient-heavy design — it'll clash with the flat, bold UI.
- **Don't** use the generic chain-link icon (it's everywhere; Tappr should be distinct).
- **Don't** use more than 2 colors in the mark (green + white, or green + black).
- **Don't** rely on thin strokes that vanish at favicon size.
- **Don't** add serif or decorative type — the rest of the product is sans-serif and utilitarian.
- **Do** make sure the mark works both filled (white/black) for monochrome use and in full color.

---

## 10. Competitive reference points (what NOT to copy, but to position against)

The obvious category reference is **Bitly** (blue, corporate) and **Linktree** (playful gradients). Tappr should NOT look like either.

Closer in spirit:
- **Vercel** — minimal black-and-white, sharp geometry, power-user aesthetic
- **Linear** — precise, monochrome-with-neon, calm confidence
- **Raycast** — dark, bright-accent, utility-first

The logo should feel like something a power user would put on their laptop sticker, not something their grandma would recognize.

---

## 11. Tagline (optional, for OG images / marketing)

Not finalized. Current candidates found in the code:
- "Intelligent Deep Link Management"
- "One link, smarter everywhere"
- "Tappr detects device & app" (used on the landing)

---

## 12. Quick checklist for final delivery

- [ ] SVG mark (square, balanced for 16×16 through 512×512)
- [ ] SVG wordmark (mark + "Tappr" text, horizontal)
- [ ] SVG lockup variant for email/dark-mode headers (short & wide)
- [ ] Monochrome versions: pure white on black, pure black on white
- [ ] PNG exports at 32, 64, 128, 256, 512 for non-SVG contexts
- [ ] Favicon package (`.ico` + `apple-touch-icon.png`)
- [ ] Brief usage guide: clear-space rule, min size, don'ts

---

**TL;DR for the designer:**
Dark-theme tech product. Brand color **#00D26A** spring green. Logo should feel *instant, electric, precise* — not generic "link tool". Keep the `Ta + green ppr` wordmark pattern. Replace the current chain-link icon with something more aligned to "tap / detect / route" (lightning direction recommended). Must work at 16×16 and 512×512 equally, in green-on-black and black-on-white.
