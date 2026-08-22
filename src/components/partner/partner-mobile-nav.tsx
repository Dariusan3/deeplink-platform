"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PartnerSidebar } from "@/components/partner/partner-sidebar";
import { Menu, X } from "lucide-react";
import { TapprMark } from "@/components/brand/logo";

// Mobile-only nav: a fixed top bar with a hamburger that opens the
// PartnerSidebar as a slide-over drawer. The desktop sidebar stays as-is
// (hidden md:flex in the layout); this fills the sub-md gap where there was
// previously no navigation at all.
export function PartnerMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on route change so tapping a nav link dismisses the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="md:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-sidebar-border bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <TapprMark className="w-7 h-7 text-[#A855F7] shrink-0" />
          <span className="font-black text-lg text-white tracking-tighter">
            Ta<span className="text-[#A855F7]">ppr</span>
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A855F7]">
            Partner
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in"
          />
          {/* Panel */}
          <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-4 right-3 z-10 w-8 h-8 rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
            <PartnerSidebar />
          </div>
        </div>
      )}
    </>
  );
}
