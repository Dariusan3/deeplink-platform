"use client";

import { MobileSidebar } from "@/components/sidebar";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 px-4 md:px-6 h-16">
        <MobileSidebar />
        <Separator orientation="vertical" className="h-6 md:hidden bg-white/10" />
        <h1 className="text-xl font-black tracking-tight text-white">{title}</h1>
      </div>
    </header>
  );
}
