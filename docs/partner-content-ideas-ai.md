# Partner Content Ideas (AI) — replaces Promo Kit

The static Promo Kit templates were stale ("25% off" that doesn't exist) and
generic. `/partner/promo` is now an AI generator; sidebar label "Content Ideas".

- Page: `src/app/partner/promo/page.tsx` — pick platform, format, tone, niche,
  audience → "Generează idei" → 5 ready-to-post ideas with the partner's link,
  copy button. Route path kept (`/partner/promo`) so old links still work.
- API: `POST /api/partner/content-ideas` — partner-only (403 otherwise),
  20 generations/hour/user (in-memory, per instance), Groq
  `llama-3.3-70b-versatile` (same provider as the rest of the AI features,
  needs `GROQ_API_KEY`).
- The system prompt holds the product facts and hard rules from
  `docs/partner-content-kit-ro.md`: no discounts, no trial, no testimonials or
  user counts, no income promises or commission talk, no QR/custom domain/IG
  connect, no competitor names. Output is Romanian.
- Keep the prompt in step with pricing/features when they change.
