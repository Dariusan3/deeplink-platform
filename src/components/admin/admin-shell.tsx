"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Shield,
  ArrowLeft,
  ScrollText,
  Wallet,
} from "lucide-react";

const adminNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Activity Log", href: "/admin/activity", icon: ScrollText },
  { name: "Users & Teams", href: "/admin/users", icon: Users },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Payouts", href: "/admin/payouts", icon: Wallet },
];

// Presentational shell only. Access control lives in the server layout
// (src/app/admin/layout.tsx), which verifies auth + is_admin before this
// ever renders — so there's no client-side PIN or secret here.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black flex">
      {/* Admin Sidebar */}
      <div className="w-64 border-r border-white/5 bg-black/50 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Admin Panel</p>
              <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Tappr CRM</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Dashboard
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                  isActive
                    ? "bg-red-500/10 text-red-400"
                    : "text-neutral-500 hover:text-white hover:bg-white/[0.03]"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
