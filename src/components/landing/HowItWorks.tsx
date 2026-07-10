import { Reveal } from "./Reveal";

/**
 * Owns the `#how` anchor. The hero's "See how it works" button pointed at
 * `#how` while no such element existed, so the button silently did nothing.
 *
 * Numbered, answer-first steps — the structure generative engines extract and
 * cite most reliably. Keep each step to one verifiable sentence.
 */
const STEPS = [
  {
    n: "/01",
    title: "Create the link",
    body:
      "Paste your destination and pick a slug. You get tappr.me/<slug> immediately — no configuration required to start.",
    detail: "tappr.me/promo → shop.io",
  },
  {
    n: "/02",
    title: "Add routing rules",
    body:
      "Point the same link at different destinations by country, device, time of day, day of week, or date range. Rules evaluate top to bottom, and the first match wins.",
    detail: "if country=US ∧ device=mobile → App Store",
  },
  {
    n: "/03",
    title: "Read what actually happened",
    body:
      "Every click is classified before it redirects. Bots are flagged, anomalies raise alerts within the hour, and the AI Brain explains shifts in plain English.",
    // Closes the loop on the hero ("You got 2,400 clicks"). Deliberately not a
    // second −67% drop: the AI Brain cell in ProductBento already tells that
    // story, and the two disagreed on the time window.
    detail: "2,400 clicks → 600 real · 1,800 bots",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-[var(--line)] py-24 lg:py-32 scroll-mt-[60px]">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <span className="ulabel">How it works</span>
        </Reveal>
        <Reveal delay={60}>
          <h2
            className="mt-5 font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[860px]"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            One link, three steps,{" "}
            <span className="text-[var(--ink-2)] font-light">no guessing.</span>
          </h2>
        </Reveal>

        <ol className="mt-16 grid grid-cols-1 md:grid-cols-3 border-t border-[var(--line)]">
          {STEPS.map((s, i) => (
            // Reveal renders the <li> itself — a <div> between <ol> and <li>
            // would be invalid HTML, and the grid needs the li as a direct
            // child so it stretches to the row height.
            //
            // Bodies wrap to different line counts (step 2 runs a line longer).
            // flex-1 on the body pushes the dashed rule and code line to the
            // bottom, so they stay level across all three cells.
            <Reveal
              key={s.n}
              delay={i * 60}
              as="li"
              className="list-none flex flex-col p-8 lg:p-10 border-b md:border-b-0 md:border-r last:border-r-0 border-[var(--line)]"
            >
              <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">
                {s.n}
              </span>
              <h3 className="mt-5 text-[20px] lg:text-[22px] font-semibold text-[var(--ink)] tracking-[-0.02em] leading-[1.2]">
                {s.title}
              </h3>
              <p className="mt-4 flex-1 text-[14px] leading-[1.6] text-[var(--ink-2)]">{s.body}</p>
              <code className="mt-6 pt-4 border-t border-dashed border-[var(--line-2)] block font-mono text-[12px] text-[var(--tappr-green)] break-words">
                {s.detail}
              </code>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
