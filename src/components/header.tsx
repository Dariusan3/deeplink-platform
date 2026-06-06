"use client";

import { MobileSidebar } from "@/components/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationBell } from "@/components/header/notification-bell";

interface HeaderProps {
  title?: string;
  // Some surfaces (admin, partner) have their own notification systems —
  // pass `hideBell` to suppress it. Defaults to visible.
  hideBell?: boolean;
}

export function Header({ title = "Dashboard", hideBell = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 px-4 md:px-6 h-16">
        <MobileSidebar />
        <Separator orientation="vertical" className="h-6 md:hidden bg-white/10" />
        <h1 className="text-xl font-black tracking-tight text-white">{title}</h1>
        {!hideBell && (
          <div className="ml-auto">
            <NotificationBell />
          </div>
        )}
      </div>
    </header>
  );
}
