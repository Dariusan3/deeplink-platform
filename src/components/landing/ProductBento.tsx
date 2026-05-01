import { Reveal } from "./Reveal";

export function ProductBento() {
  return (
    <section id="product" className="border-b border-[var(--line)] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <span className="ulabel">The product</span>
        </Reveal>
        <Reveal delay={60}>
          <h2
            className="mt-5 font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[920px]"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            Built for the way you{" "}
            <span className="text-[var(--ink-2)] font-light">actually distribute</span> links.
          </h2>
        </Reveal>

        {/* Bento — flat 1px grid, no rounded inner cells. */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-6 gap-px bg-[var(--line)] border border-[var(--line)]">
          <SmartRouting />
          <AiBrain />
          <RealtimeAlert />
          <AbTesting />
          <DeveloperApi />
        </div>
      </div>
    </section>
  );
}

function CellLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">{n}</span>
      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--muted)]">{label}</span>
    </div>
  );
}

function SmartRouting() {
  const rules = [
    { rule: "if country=US ∧ device=mobile", dest: "→ apps.apple.com/...", active: true },
    { rule: "if country=RO ∧ device=mobile", dest: "→ ro.ourshop.com/promo" },
    { rule: "if hour ∈ [22, 6]", dest: "→ wa.me/40700000000" },
    { rule: "default", dest: "→ tappr.me/landing-fallback" },
  ];
  return (
    <Reveal className="lg:col-span-4 lg:row-span-2 bg-[var(--bg)] p-8 lg:p-10">
      <CellLabel n="/01" label="Smart Routing" />
      <h3
        className="font-semibold text-[var(--ink)] tracking-[-0.03em]"
        style={{ fontSize: "clamp(28px, 3.4vw, 44px)", lineHeight: 1 }}
      >
        One link.{" "}
        <span className="text-[var(--ink-2)] font-light">Every context.</span>
      </h3>
      <p className="mt-5 max-w-[520px] text-[14px] leading-[1.6] text-[var(--ink-2)]">
        Set rules per country, device, time of day, day of week, or date range.
        Mobile users in the US get the App Store. Desktop visitors in Romania
        hit your localized site. Saturday traffic flows to a weekend landing —
        all from a single tappr.me/&lt;slug&gt;.
      </p>

      <div className="mt-8 space-y-2">
        {rules.map((r, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-4 px-4 py-3 border rounded-sm font-mono text-[12px] ${
              r.active
                ? "row-active text-[var(--ink)]"
                : "border-[var(--line)] text-[var(--ink-2)]"
            }`}
          >
            <code className="truncate">{r.rule}</code>
            <code className="text-[var(--muted)] truncate">{r.dest}</code>
          </div>
        ))}
        <div className="flex items-center justify-center px-4 py-3 border border-dashed border-[var(--line-2)] rounded-sm font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--muted)] hover:text-[var(--ink-2)] hover:border-[var(--ink-2)] transition-colors cursor-pointer">
          + add rule
        </div>
      </div>
    </Reveal>
  );
}

function AiBrain() {
  return (
    <Reveal id="ai-brain" delay={60} className="lg:col-span-2 bg-[var(--bg)] p-8">
      <CellLabel n="/02" label="AI Brain" />
      <code className="block font-mono text-[12px] text-[var(--ink-2)] mb-4">
        › why did /promo lose traffic?
      </code>
      <div className="border border-[var(--tappr-green)]/30 bg-[var(--green-soft)] rounded-sm p-4">
        <p className="text-[13px] text-[var(--ink)] leading-[1.6]">
          Down{" "}
          <span className="text-[var(--tappr-green)] font-semibold">67% in 12h</span>.
          Last week 84% of clicks came from instagram.com/p/abc — that referrer
          dropped to zero today. Likely cause: the post was deleted.
        </p>
        <p className="mt-3 font-mono text-[11px] tracking-[0.05em] text-[var(--tappr-green)]">
          → DM the account or pivot /promo to a TikTok-first strategy.
        </p>
      </div>
    </Reveal>
  );
}

function RealtimeAlert() {
  return (
    <Reveal delay={120} className="lg:col-span-2 bg-[var(--bg)] p-8">
      <CellLabel n="/03" label="Real-Time Alerts" />
      <div className="border border-red-500/30 bg-red-500/5 rounded-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-red-400 border border-red-500/40 rounded-full px-2 py-0.5">
            DROP
          </span>
          <code className="font-mono text-[11px] text-[var(--muted)]">/promo</code>
        </div>
        <p className="text-[36px] font-semibold text-red-400 leading-none tracking-[-0.04em]">
          −67%
        </p>
        <p className="mt-3 text-[12px] text-[var(--ink-2)] leading-[1.5]">
          in the last 90 minutes — likely a deleted Instagram post. Action: DM
          @username to repost or pivot the campaign.
        </p>
      </div>
    </Reveal>
  );
}

function AbTesting() {
  return (
    <Reveal delay={60} className="lg:col-span-3 bg-[var(--bg)] p-8 lg:p-10">
      <CellLabel n="/04" label="A/B Testing" />
      <h3 className="font-semibold text-[var(--ink)] tracking-[-0.02em] text-[20px]">
        Test variants. <span className="text-[var(--ink-2)] font-light">Auto-pick the winner.</span>
      </h3>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2 font-mono text-[12px]">
            <code className="text-[var(--ink)]">A/landing-v1</code>
            <span className="text-[var(--tappr-green)]">7.4%</span>
          </div>
          <div className="h-1.5 bg-[var(--line)] rounded-sm overflow-hidden">
            <div className="h-full bg-[var(--tappr-green)]" style={{ width: "88%" }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2 font-mono text-[12px]">
            <code className="text-[var(--ink-2)]">B/landing-v2</code>
            <span className="text-[var(--ink-2)]">4.1%</span>
          </div>
          <div className="h-1.5 bg-[var(--line)] rounded-sm overflow-hidden">
            <div className="h-full bg-[var(--ink-2)]" style={{ width: "49%" }} />
          </div>
        </div>
      </div>

      <p className="mt-6 font-mono text-[11px] tracking-[0.14em] uppercase text-[var(--tappr-green)]">
        ★ winner: A/landing-v1 — auto-routed to 100%
      </p>
    </Reveal>
  );
}

function DeveloperApi() {
  return (
    <Reveal id="api" delay={120} className="lg:col-span-3 bg-[var(--bg)] p-8 lg:p-10">
      <CellLabel n="/05" label="Developer API" />
      <h3 className="font-semibold text-[var(--ink)] tracking-[-0.02em] text-[20px] mb-5">
        REST API. <span className="text-[var(--ink-2)] font-light">Bearer auth, full smart-routing.</span>
      </h3>

      <div className="border border-[var(--line)] rounded-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-black border-b border-[var(--line)]">
          <span className="font-mono text-[10px] tracking-[0.14em] uppercase bg-[var(--green-soft)] text-[var(--tappr-green)] border border-[var(--tappr-green)]/40 rounded-sm px-1.5 py-0.5">
            POST
          </span>
          <code className="font-mono text-[11px] text-[var(--ink-2)]">
            tappr.me/api/v1/links
          </code>
        </div>
        <pre className="p-4 font-mono text-[11px] leading-[1.7] text-[var(--ink-2)] overflow-x-auto">
{`curl -X `}<span className="text-[#a855f7]">POST</span>{` https://tappr.me/api/v1/links \\
  -H `}<span className="text-[#84cc16]">{`"Authorization: Bearer dl_xxx"`}</span>{` \\
  -H `}<span className="text-[#84cc16]">{`"Content-Type: application/json"`}</span>{` \\
  -d `}<span className="text-[#84cc16]">{`'{
    "destination_url": "https://shop.io",
    "slug": "promo",
    "redirect_rules": [
      { "country": "US", "destination": "apps.apple.com/x" },
      { "country": "RO", "destination": "ro.ourshop.com" }
    ]
  }'`}</span>
        </pre>
      </div>
    </Reveal>
  );
}
