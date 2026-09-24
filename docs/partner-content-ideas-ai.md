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
  `docs/partner-claude-kit-ro.md`: no discounts, no trial, no testimonials or
  user counts, no income promises or commission talk, no QR/custom domain/IG
  connect, no competitor names. Output is Romanian.
- Keep the prompt in step with pricing/features when they change.

## Fix: every generation returned 502
Groq no longer serves `llama-3.3-70b-versatile` for our key
(`404 model_not_found`), so the call threw and the route answered 502. The route
now uses `openai/gpt-oss-120b` (`reasoning_effort: "low"`, `max_tokens: 6000`
because the limit also covers hidden reasoning). Verified against the Groq API.

**Same dead model is still used by `src/app/api/ai/chat/route.ts` (AI Brain) and
`src/app/api/ai/weekly-report/route.ts`** — both fail the same way until moved to
a live model.

## Follow-up: all Groq features moved to live models
`llama-3.1-8b-instant` was gone too. New `src/lib/ai-model.ts` holds the model
names (`AI_MODEL` = gpt-oss-120b, `AI_MODEL_FAST` = gpt-oss-20b). Switched:
AI Brain chat (`/api/ai/chat`, tool-calling), weekly report, both anomaly-check
routes (alert root cause / action), and content ideas. `max_tokens` raised
(reasoning models spend part of it thinking). Verified against the Groq API:
tool-call round trip, JSON output and plain text all work. When AI features
start failing, check `GET https://api.groq.com/openai/v1/models` first.
