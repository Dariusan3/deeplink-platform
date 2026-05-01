"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Visitor = {
  flag: string;
  origin: string;
  meta: string;
  via: string;
  badge: string;
  rule: string;
  destLabel: string;
  destHost: string;
  ms: number;
};

const VISITORS: Visitor[] = [
  {
    flag: "🇺🇸",
    origin: "US · Desktop",
    meta: "via twitter.com/ad",
    via: "Chrome 124",
    badge: "CH 124",
    rule: "if country=US ∧ device=desktop",
    destLabel: "App Store",
    destHost: "apps.apple.com",
    ms: 12,
  },
  {
    flag: "🇷🇴",
    origin: "RO · Mobile",
    meta: "via instagram.com/bio",
    via: "iOS 17 Safari",
    badge: "iOS 17",
    rule: "if country=RO ∧ device=mobile",
    destLabel: "Localized shop",
    destHost: "ro.ourshop.com",
    ms: 18,
  },
  {
    flag: "🟪",
    origin: "TT · In-app",
    meta: "via tiktok.com/@you",
    via: "TikTok webview",
    badge: "WEBVIEW",
    rule: "if device=mobile ∧ source=tiktok",
    destLabel: "WhatsApp fallback",
    destHost: "wa.me/40700000000",
    ms: 21,
  },
];

const AUTO_INTERVAL = 2400;
const PAUSE_MS = 8000;

export function LiveRouter() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cycle = useCallback(() => {
    setActive((i) => (i + 1) % VISITORS.length);
  }, []);

  // Auto-cycle while not paused.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(cycle, AUTO_INTERVAL);
    return () => clearInterval(id);
  }, [paused, cycle]);

  const handleClick = (i: number) => {
    setActive(i);
    setPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setPaused(false), PAUSE_MS);
  };

  useEffect(() => () => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
  }, []);

  const v = VISITORS[active];

  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-md overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,210,106,0.15)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-3 px-4 h-10 border-b border-[var(--line)] bg-black">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#262626]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#262626]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#262626]" />
        </div>
        <div className="flex-1 flex justify-center">
          <span className="font-mono text-[12px] text-[var(--ink-2)]">tappr.me/promo</span>
        </div>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--tappr-green)] border border-[var(--tappr-green)]/30 rounded-full px-2 py-0.5">
          <span className="live-dot" />
          LIVE
        </span>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-2 divide-x divide-[var(--line)]">
        {/* Visitor column */}
        <div className="p-4 space-y-3">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">Visitor</p>
          {VISITORS.map((row, i) => (
            <button
              key={i}
              type="button"
              role="button"
              aria-label={`Route ${row.origin} visitor`}
              aria-pressed={active === i}
              onClick={() => handleClick(i)}
              className={`w-full text-left flex items-center gap-3 p-3 border rounded-sm transition-all ${
                active === i ? "row-active" : "border-[var(--line)] hover:border-[var(--line-2)]"
              }`}
            >
              <span className="text-lg" aria-hidden>{row.flag}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-[var(--ink)] font-medium truncate">{row.origin}</span>
                <span className="block text-[11px] text-[var(--muted)] truncate">{row.meta}</span>
              </span>
              <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[var(--ink-2)] border border-[var(--line)] rounded-sm px-1.5 py-0.5">
                {row.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Destination column */}
        <div className="p-4 space-y-3">
          <p className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">Resolves to</p>
          {VISITORS.map((row, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 border rounded-sm transition-all ${
                active === i ? "row-active" : "border-[var(--line)]"
              }`}
            >
              <span
                aria-hidden
                className={`w-2 h-2 rounded-full ${active === i ? "bg-[var(--tappr-green)]" : "bg-[var(--line-2)]"}`}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] text-[var(--ink)] font-medium truncate">{row.destLabel}</span>
                <span className="block font-mono text-[11px] text-[var(--muted)] truncate">{row.destHost}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer rule strip */}
      <div className="border-t border-[var(--line)] px-4 py-3 flex items-center justify-between gap-3 bg-black">
        <code className="font-mono text-[12px] text-[var(--tappr-green)] truncate">{v.rule}</code>
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
          resolved {v.ms}ms ago
        </span>
      </div>
      <p className="px-4 pb-3 pt-1 text-[11px] text-[var(--muted)]">
        Click any visitor to see how it routes.
      </p>
    </div>
  );
}
