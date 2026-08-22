"use client";

import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TapprMark } from "@/components/brand/logo";
import { PartnerSidebar } from "@/components/partner/partner-sidebar";

// Mobile top bar for the Partner area — the same shape as the main dashboard's
// Header (src/components/header.tsx): h-16, sticky, blurred, with the menu
// trigger FIRST, then a separator, then the title. Same trigger markup as
// MobileSidebar in src/components/sidebar.tsx, so the fold control sits in the
// same place and looks the same in both sections.
//
// This used to be its own thing: a shorter h-14 bar with the trigger pushed to
// the far right as a bordered box, opening a hand-rolled drawer that
// reimplemented the backdrop, the Escape handler and the body-scroll lock that
// Sheet already provides.
//
// `key={pathname}` remounts the Sheet on navigation, which closes it. The old
// drawer did the same thing with an effect that set state on every route
// change; remounting says it declaratively and drops the effect.
export function PartnerMobileNav() {
  const pathname = usePathname();

  return (
    <header className="md:hidden sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 px-4 h-16">
        <Sheet key={pathname}>
          <SheetTrigger
            id="partner-mobile-sidebar-trigger"
            data-slot="button"
            nativeButton={true}
            aria-label="Open menu"
            render={<button className={cn(buttonVariants({ variant: "ghost", size: "icon" }))} />}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <PartnerSidebar />
          </SheetContent>
        </Sheet>

        <Separator orientation="vertical" className="h-6 bg-white/10" />

        <div className="flex items-center gap-2 min-w-0">
          <TapprMark className="w-6 h-6 text-[#A855F7] shrink-0" />
          <span className="text-xl font-black tracking-tight text-white">
            Ta<span className="text-[#A855F7]">ppr</span>
          </span>
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.2em] text-[#A855F7] leading-none">
            Partner
          </span>
        </div>
      </div>
    </header>
  );
}
