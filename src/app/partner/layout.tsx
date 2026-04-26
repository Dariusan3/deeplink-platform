"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { PartnerSidebar } from "@/components/partner/partner-sidebar";
import { UserProvider } from "@/providers/user-provider";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <TooltipProvider delay={0}>
        <div className="flex h-screen overflow-hidden bg-black text-white relative">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00D26A]/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00D26A]/3 blur-[100px] rounded-full -z-10 pointer-events-none" />

          <div className="hidden md:flex">
            <PartnerSidebar />
          </div>

          <main className="flex-1 overflow-y-auto relative z-0">
            {children}
          </main>
        </div>
      </TooltipProvider>
    </UserProvider>
  );
}
