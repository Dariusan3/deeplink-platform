import Link from "next/link";
import { Reveal } from "./Reveal";

export function FinalCta() {
  return (
    <section className="relative border-b border-[var(--line)] overflow-hidden">
      {/* Top + bottom green radial gradients (only place besides hero) */}
      <div
        aria-hidden
        className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,210,106,0.25) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />
      <div
        aria-hidden
        className="absolute -bottom-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,210,106,0.18) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-6 py-[160px] text-center">
        <Reveal>
          <h2
            className="font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[860px] mx-auto"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            Stop losing clicks you can&apos;t{" "}
            <span className="text-[var(--tappr-green)] font-light">explain.</span>
          </h2>
        </Reveal>

        <Reveal delay={60}>
          <p className="mt-6 text-[16px] lg:text-[18px] text-[var(--ink-2)] max-w-[560px] mx-auto leading-[1.55]">
            Free plan. No credit card. 500 clicks per month, forever.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <Link
            href="/signup"
            className="btn-lift mt-10 inline-flex items-center gap-2 bg-white text-black font-medium px-7 py-4 rounded-sm hover:bg-[var(--ink)]"
          >
            Start free — no card
          </Link>
        </Reveal>

        <Reveal delay={180}>
          <p className="mt-8 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">
            Cancel anytime · Your data is yours · SOC 2 Type II in progress
          </p>
        </Reveal>
      </div>
    </section>
  );
}
