import { Reveal } from "./Reveal";

const STATS = [
  ["CLICKS ROUTED", "1.4B+"],
  ["BOTS BLOCKED", "312M"],
  ["P50 LATENCY", "14ms"],
  ["UPTIME", "99.99%"],
  ["EDGE NODES", "38"],
];

export function ProofStrip() {
  return (
    <section className="border-b border-[var(--line)] bg-black">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <ul className="flex flex-wrap items-center justify-between gap-x-10 gap-y-3 py-5 font-mono text-[11px] tracking-[0.14em] uppercase">
            {STATS.map(([label, value], i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[var(--muted)]">{label}</span>
                <span className="text-[var(--ink)]">{value}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
