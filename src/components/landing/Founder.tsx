import { Reveal } from "./Reveal";

export function Founder() {
  return (
    <section className="border-b border-[var(--line)] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10">
        <Reveal>
          <div className="font-mono text-[11px] tracking-[0.14em] uppercase">
            <p className="ulabel mb-6">From the team</p>
            <p className="text-[var(--ink)]">Tappr Labs</p>
            <p className="text-[var(--muted)] mt-1">Built in Bucharest &amp; Brooklyn</p>
          </div>
        </Reveal>

        <div className="space-y-7" style={{ fontSize: "clamp(20px, 2vw, 28px)", lineHeight: 1.4 }}>
          <Reveal delay={60}>
            <p className="text-[var(--ink)] font-light">
              We tried Bitly. It told us a campaign got clicks —{" "}
              <span className="text-[var(--ink-2)] font-light">not which clicks were bots,</span>{" "}
              not why a link suddenly died, not which post we should reshare.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-[var(--ink)] font-light">
              We tried Linktree. It looks fine on a phone.{" "}
              <span className="text-[var(--ink-2)] font-light">It&apos;s not built</span> for routing.{" "}
              <span className="text-[var(--ink-2)] font-light">It&apos;s not built</span> for analysis.{" "}
              And it&apos;s definitely not built for anyone running paid campaigns or A/B tests.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <p className="text-[var(--ink)] font-light">
              So we built <span className="text-[var(--tappr-green)] font-semibold">Tappr</span> —
              for the people who actually depend on links working, knowing why
              they work, and reacting fast when they don&apos;t.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
