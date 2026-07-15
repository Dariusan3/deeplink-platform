"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PartnerSidebar } from "@/components/partner/partner-sidebar";
import { PartnerMobileNav } from "@/components/partner/partner-mobile-nav";
import { UserProvider } from "@/providers/user-provider";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <TooltipProvider delay={0}>
        <div className="flex h-screen overflow-hidden bg-black text-white relative">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A855F7]/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#A855F7]/3 blur-[100px] rounded-full -z-10 pointer-events-none" />

          <div className="hidden md:flex">
            <PartnerSidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 relative z-0">
            <PartnerMobileNav />
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </UserProvider>
  );
}
