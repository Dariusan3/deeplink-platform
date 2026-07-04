import Link from "next/link";
import { Reveal } from "./Reveal";
import { LiveRouter } from "./LiveRouter";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)]">
      <div className="hero-glow" aria-hidden />

      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 relative z-10">
        {/* Left — copy */}
        <div className="px-6 lg:px-10 py-20 lg:py-28 lg:border-r border-[var(--line)]">
          <Reveal>
            <a
              href="#ai-brain"
              className="inline-flex items-center gap-2 text-[12px] font-mono tracking-[0.06em] text-[var(--ink-2)] border border-[var(--line)] hover:border-[var(--line-2)] rounded-full px-3 py-1 mb-10"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--tappr-green)]" />
              NEW · AI Brain explains your traffic in plain English →
            </a>
          </Reveal>

          <Reveal delay={60}>
            <h1
              className="font-semibold text-[var(--ink)] tracking-[-0.05em]"
              style={{
                fontSize: "clamp(48px, 8vw, 116px)",
                lineHeight: 0.92,
              }}
            >
              Bitly says{" "}
              <span className="line-through decoration-[var(--ink-2)] text-[var(--ink-2)]">
                2,400 clicks
              </span>
              .{" "}
              <span className="text-[var(--ink-2)] font-light">It doesn&apos;t say</span>{" "}
              <span className="text-[var(--tappr-green)]">1,800 were bots.</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="mt-8 text-[var(--ink-2)] text-[18px] leading-[1.55] max-w-[540px]">
              Tappr does. Smart routing, real-time anomaly alerts, and an AI that
              explains your traffic — for creators &amp; marketers who can&apos;t afford
              guessing.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="btn-lift inline-flex items-center gap-2 bg-white text-black font-medium px-5 py-3 rounded-sm hover:bg-[var(--ink)]"
              >
                Start free — no card
              </Link>
              {/* Existing users — a clear CTA button right beside "Start free",
                  green-accented so it reads as an action, not a nav link. */}
              <Link
                href="/login"
                className="btn-lift inline-flex items-center gap-2 px-5 py-3 border border-[var(--tappr-green)]/50 bg-[var(--tappr-green)]/10 text-[var(--tappr-green)] font-medium hover:bg-[var(--tappr-green)]/20 hover:border-[var(--tappr-green)] rounded-sm"
              >
                Log in →
              </Link>
              <a
                href="#how"
                className="btn-lift inline-flex items-center gap-2 px-5 py-3 border border-[var(--line)] hover:border-[var(--line-2)] text-[var(--ink-2)] hover:text-[var(--ink)] rounded-sm"
              >
                See how it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-[var(--muted)] font-mono">
              {[
                "No credit card",
                "500 clicks/mo, free forever",
                "Up in 60 seconds",
              ].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckGreen />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Right — live product card */}
        <div className="px-6 lg:px-10 py-12 lg:py-20 flex items-center">
          <Reveal delay={120} className="w-full">
            <LiveRouter />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function CheckGreen() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6.5L5 9.5L10 3.5" stroke="#00D26A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
