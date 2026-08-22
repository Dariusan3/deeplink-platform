"use client";

import { cn } from "@/lib/utils";
import { TapprMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

// The parts of the sidebar that must look identical in the main dashboard and
// in the Partner area: the frame, and the header row with the wordmark and the
// collapse toggle.
//
// These lived twice — src/components/sidebar.tsx and
// src/components/partner/partner-sidebar.tsx were separate implementations of
// the same chrome. They drifted, as two copies do: the Partner header stacked
// the wordmark over a second line so its baseline sat higher than the main
// one, its toggle was a bare <button> instead of the shared Button (different
// padding, so the fold control landed a few pixels off), it drew lucide icons
// where the main sidebar draws inline SVG at a different optical size, and its
// frame was h-screen against the main one's h-full.
//
// Anything that must match between the two belongs here, not copied into both.

export type SidebarAccent = "green" | "purple";

// Tailwind needs literal class strings, so these are spelled out rather than
// interpolated from a hex value.
const ACCENTS: Record<
  SidebarAccent,
  { mark: string; word: string; toggle: string; toggleCollapsed: string }
> = {
  green: {
    mark: "text-[#00D26A]",
    word: "text-[#00D26A]",
    toggle: "hover:bg-[#00D26A]/10 hover:text-[#00D26A]",
    toggleCollapsed: "bg-[#00D26A]/5 text-[#00D26A]",
  },
  purple: {
    mark: "text-[#A855F7]",
    word: "text-[#A855F7]",
    toggle: "hover:bg-[#A855F7]/10 hover:text-[#A855F7]",
    toggleCollapsed: "bg-[#A855F7]/5 text-[#A855F7]",
  },
};

/** Outer column. `h-full`, so the parent decides the height — the desktop flex
 *  row and the mobile drawer size it differently and both are correct. */
export function SidebarFrame({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {children}
    </div>
  );
}

/**
 * The h-16 header row: wordmark on the left, collapse toggle on the right.
 *
 * `label` is an optional inline tag after the wordmark — "Partner" — kept on
 * the SAME line on purpose. Stacking it underneath is what pushed the Partner
 * wordmark out of alignment with the main one.
 */
export function SidebarHeader({
  collapsed,
  onToggle,
  accent = "green",
  label,
}: {
  collapsed: boolean;
  // Optional: the main dashboard passes the toggle down from its shell, and
  // renders the same sidebar inside a mobile Sheet where there is nothing to
  // collapse.
  onToggle?: () => void;
  accent?: SidebarAccent;
  label?: string;
}) {
  const a = ACCENTS[accent];

  return (
    <div
      className={cn(
        "flex items-center h-16 border-b border-sidebar-border transition-all duration-300",
        collapsed ? "justify-center px-0" : "px-4 gap-3"
      )}
    >
      {!collapsed && (
        <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
          <TapprMark className={cn("w-8 h-8 shrink-0", a.mark)} />
          <span className="font-black text-xl text-white tracking-tighter">
            Ta<span className={a.word}>ppr</span>
          </span>
          {label && (
            <span
              className={cn(
                "shrink-0 text-[10px] font-black uppercase tracking-[0.2em] leading-none",
                a.word
              )}
            >
              {label}
            </span>
          )}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "transition-all duration-300",
          a.toggle,
          collapsed
            ? cn("w-10 h-10 rounded-xl hover:scale-110 active:scale-95", a.toggleCollapsed)
            : "ml-auto w-8 h-8 text-neutral-500 hover:text-white"
        )}
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </Button>
    </div>
  );
}
