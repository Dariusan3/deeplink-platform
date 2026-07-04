import Link from "next/link";

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 h-[60px] bg-black/80 backdrop-blur-xl border-b border-[var(--line)]">
      <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center gap-6 text-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--ink)]">
          <span className="inline-block w-5 h-5 rounded-sm bg-[var(--tappr-green)]" aria-hidden />
          <span>Tappr</span>
        </Link>

        <div className="w-px h-5 bg-[var(--line)]" />

        <span className="hidden md:inline-block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)] border border-[var(--line)] px-2 py-0.5 rounded-sm">
          v0.4 — Beta
        </span>

        {/* Center links */}
        <div className="hidden lg:flex items-center gap-5 ml-4 text-[var(--ink-2)]">
          {[
            { label: "Product", href: "#product" },
            { label: "Pricing", href: "#pricing" },
            { label: "API", href: "#api" },
            { label: "Changelog", href: "/changelog" },
            { label: "Docs", href: "/docs" },
          ].map((l) => (
            <a key={l.href} href={l.href} className="hover:text-[var(--ink)] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/login"
            className="btn-lift inline-block px-3 py-1.5 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            Sign in
          </Link>
          <a
            href="mailto:hello@tappr.me?subject=Demo%20request"
            className="hidden sm:inline-block btn-lift px-3 py-1.5 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            Book a demo
          </a>
          <Link
            href="/signup"
            className="btn-lift px-3 py-1.5 bg-white text-black font-medium rounded-sm hover:bg-[var(--ink)]"
          >
            Start free →
          </Link>
        </div>
      </div>
    </nav>
  );
}
