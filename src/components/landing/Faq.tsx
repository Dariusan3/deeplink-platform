import { Reveal } from "./Reveal";
import { FAQ } from "@/lib/seo";

/**
 * Visible counterpart to the FAQPage JSON-LD emitted on the landing page.
 * Both read from the same FAQ array in src/lib/seo.ts — structured data must
 * match what the user sees, or Google treats it as a policy violation.
 *
 * Native <details>/<summary> so the answers are in the DOM (and crawlable)
 * even while collapsed, with no client JS.
 */
export function Faq() {
  return (
    <section id="faq" className="border-b border-[var(--line)] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <span className="ulabel">FAQ</span>
        </Reveal>
        <Reveal delay={60}>
          <h2
            className="mt-5 font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[860px]"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            Questions people ask{" "}
            <span className="text-[var(--ink-2)] font-light">before switching.</span>
          </h2>
        </Reveal>

        <div className="mt-16 border-t border-[var(--line)]">
          {FAQ.map((item, i) => (
            <Reveal key={item.question} delay={Math.min(i * 40, 200)}>
              <details className="group border-b border-[var(--line)]">
                <summary className="flex items-start gap-6 py-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] pt-1.5 shrink-0">
                    /{String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="flex-1 text-[18px] lg:text-[20px] font-semibold text-[var(--ink)] tracking-[-0.02em] leading-[1.3]">
                    {item.question}
                  </h3>
                  <span
                    aria-hidden
                    className="shrink-0 text-[var(--tappr-green)] text-[20px] leading-none pt-1 transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-7 pl-0 sm:pl-[4.25rem] pr-0 sm:pr-10 text-[15px] leading-[1.65] text-[var(--ink-2)] max-w-[820px]">
                  {item.answer}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
