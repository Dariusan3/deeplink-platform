import Link from "next/link";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "API", href: "/dashboard/developer" },
      { label: "Affiliate", href: "/partner" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "/dashboard/contact" },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Status", href: "https://status.tappr.me" },
      { label: "Compare → Bitly", href: "/compare/bitly" },
      { label: "Compare → Linktree", href: "/compare/linktree" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-black">
      <div className="max-w-[1280px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <span className="inline-block w-5 h-5 rounded-sm bg-[var(--tappr-green)]" aria-hidden />
            <span>Tappr</span>
          </Link>
          <p className="mt-4 max-w-[320px] text-[14px] text-[var(--ink-2)] leading-[1.55]">
            Smart links for people who can&apos;t afford guessing. Built at the edge,
            in 38 cities.
          </p>
        </div>

        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">{c.title}</p>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-mono text-[11px] tracking-[0.05em] text-[var(--muted)]">
            tappr.me · v0.4 · 2026 — Made for creators who hate guessing.
          </p>
          <div className="flex items-center gap-2">
            <SocialIcon href="https://x.com/tappr" label="X / Twitter">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </SocialIcon>
            <SocialIcon href="https://github.com/tappr" label="GitHub">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.92.57.1.79-.25.79-.55v-2.05c-3.2.7-3.87-1.37-3.87-1.37-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.97 10.97 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.36.78 1.06.78 2.14v3.18c0 .31.21.66.79.55C20.21 21.39 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </SocialIcon>
            <SocialIcon href="https://linkedin.com/company/tappr" label="LinkedIn">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.36-1.85c3.59 0 4.26 2.36 4.26 5.43zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </SocialIcon>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex items-center justify-center w-[30px] h-[30px] border border-[var(--line)] rounded-sm text-[var(--ink-2)] hover:text-[var(--tappr-green)] hover:border-[var(--tappr-green)] hover:bg-[var(--green-soft)] transition-colors"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
