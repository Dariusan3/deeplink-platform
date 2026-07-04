import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

// Shared chrome for legal pages (/privacy, /terms). Wraps content in the
// landing design system (Nav + Footer, --ink/--line CSS vars) and applies
// prose-style typography via .legal-prose (see globals.css).
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="landing-root min-h-screen bg-black text-[var(--ink)]">
      <Nav />
      <main className="max-w-[760px] mx-auto px-6 py-16">
        <div className="mb-10">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            ← Back to Tappr
          </Link>
          <h1 className="mt-4 text-[32px] font-black tracking-tight text-[var(--ink)]">{title}</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">Last updated: {updated}</p>
        </div>

        <div className="legal-prose text-[15px] leading-[1.7] text-[var(--ink-2)]">
          {children}
        </div>

        <div className="mt-14 pt-6 border-t border-[var(--line)] flex items-center gap-4 text-[13px]">
          <Link href="/privacy" className="text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">Privacy</Link>
          <span className="text-[var(--line)]">·</span>
          <Link href="/terms" className="text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">Terms</Link>
          <span className="text-[var(--line)]">·</span>
          <Link href="/dashboard/contact" className="text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">Contact</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
