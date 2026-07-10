import { Reveal } from "./Reveal";

const CELLS = [
  {
    n: "/01",
    title: "Your top link just died and you don't know.",
    body:
      "The IG post that drove 70% of your traffic got deleted. Hours pass before you check analytics. Tappr alerts you in under an hour with the likely cause.",
    fix: "Tappr alerts you in under an hour.",
  },
  {
    n: "/02",
    title: "Half your 'viral' traffic is bots.",
    body:
      "One referrer pumping 1,800 fake clicks looks great on a dashboard until you check conversion. Tappr flags single-source concentration before the bill comes.",
    fix: "Tappr flags concentration risk early.",
  },
  {
    n: "/03",
    title: "You'll miss your goal — and it's too late to fix it.",
    body:
      "Day 25 of 30 and you're 60% behind. Too late to course-correct. Tappr forecasts the miss at day 15 and tells you what's slowing you down.",
    fix: "Tappr forecasts the miss at day 15.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-[var(--line)] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <span className="ulabel">The problem</span>
        </Reveal>
        <Reveal delay={60}>
          <h2
            className="mt-5 font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[860px]"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            {/* Targets the category, not a trademark. Naming a competitor in an
                accusatory headline asserts a fact about their product. */}
            Three things your link shortener won&apos;t tell you about{" "}
            <span className="text-[var(--ink-2)] font-light">your traffic.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 border-t border-[var(--line)]">
          {CELLS.map((c, i) => (
            <Reveal key={i} delay={i * 60}>
              {/* flex-1 on the body keeps the dashed rule and the green fix
                  line level across cells whose copy wraps to different heights. */}
              <article
                className={`flex flex-col p-8 lg:p-10 border-b md:border-b-0 md:border-r last:border-r-0 border-[var(--line)] h-full`}
              >
                <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">
                  {c.n}
                </span>
                <h3 className="mt-5 text-[20px] lg:text-[22px] font-semibold text-[var(--ink)] tracking-[-0.02em] leading-[1.2]">
                  {c.title}
                </h3>
                <p className="mt-4 flex-1 text-[14px] leading-[1.6] text-[var(--ink-2)]">{c.body}</p>
                <p className="mt-6 pt-4 border-t border-dashed border-[var(--line-2)] font-mono text-[12px] text-[var(--tappr-green)] flex items-center gap-2">
                  <span>→</span>
                  <span>{c.fix}</span>
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
