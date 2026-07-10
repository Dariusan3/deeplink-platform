import { Reveal } from "./Reveal";

/**
 * Capability strip, not a metrics strip.
 *
 * This band used to claim "1.4B+ clicks routed / 312M bots blocked / 99.99%
 * uptime / 38 edge nodes". None of it was backed by the product — and it sat
 * one row below the "v0.4 — Beta" badge in the nav, which contradicted it.
 * Unverifiable commercial claims are a legal exposure (EU Unfair Commercial
 * Practices Directive), and the landing page now emits Organization +
 * SoftwareApplication + FAQPage JSON-LD, so AI search engines cite it as fact.
 *
 * Every entry below maps to shipped behavior:
 *   - routing rules      -> src/app/[slug]/route.ts
 *   - bot detection      -> user-agent + referrer-concentration checks
 *   - free tier          -> the Free plan in Pricing.tsx
 *   - REST API           -> /api/v1/links, keys in developer settings
 *   - A/B testing        -> /dashboard/ab-testing
 *
 * Do not add a number here that cannot be pointed at in the codebase or a
 * dashboard you can screenshot.
 */
const CAPABILITIES = [
  ["ROUTING", "GEO · DEVICE · TIME"],
  ["BOT DETECTION", "REAL-TIME"],
  ["FREE TIER", "500 CLICKS / MO"],
  ["API", "REST"],
  ["A/B TESTING", "BUILT IN"],
];

export function ProofStrip() {
  return (
    <section className="border-b border-[var(--line)] bg-black">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <ul className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3 py-5 font-mono text-[11px] tracking-[0.14em] uppercase">
            {CAPABILITIES.map(([label, value], i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="text-[var(--ink)]">{value}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
