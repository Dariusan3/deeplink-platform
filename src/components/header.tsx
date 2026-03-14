"use client";

import { MobileSidebar } from "@/components/sidebar";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  title?: string;
}

export function Header({ title = "Dashboard" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center gap-4 px-4 md:px-6 h-14">
        <MobileSidebar />
        <Separator orientation="vertical" className="h-6 md:hidden" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
    </header>
  );
}
