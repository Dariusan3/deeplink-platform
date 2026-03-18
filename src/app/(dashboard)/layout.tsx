"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UsageBanner } from "@/components/dashboard/usage-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider delay={0}>
      <div className="flex h-screen overflow-hidden bg-black text-white relative">
        {/* Dashboard Spotlight Background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00D26A]/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00D26A]/3 blur-[100px] rounded-full -z-10 pointer-events-none" />

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative z-0">
          <UsageBanner />
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
