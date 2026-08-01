"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PARTNER_COMMISSION_RATE } from "@/lib/partner-config";
import {
  LayoutDashboard,
  Link2,
  Users,
  Wallet,
  Trophy,
  Megaphone,
  Settings,
  ArrowLeft,
  LogOut,
  Menu,
  ChevronRight,
} from "lucide-react";

const NAV = [
  { name: "Overview", href: "/partner", icon: LayoutDashboard },
  { name: "My Link", href: "/partner/link", icon: Link2 },
  { name: "Referrals", href: "/partner/referrals", icon: Users },
  { name: "Earnings", href: "/partner/earnings", icon: Wallet },
  { name: "Promo Kit", href: "/partner/promo", icon: Megaphone },
  { name: "Settings", href: "/partner/settings", icon: Settings },
];

const COLLAPSE_KEY = "tappr_partner_sidebar_collapsed";

export function PartnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useUser();

  // Self-managed collapse, persisted so it survives navigation/reload. Starts
  // false on both server and first client render (no hydration mismatch), then
  // hydrates from localStorage.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);
  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "Partner";
  const displayEmail = profile?.email || user?.email || "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Header — Tappr logo + partner badge, with a collapse toggle. */}
      <div className={cn(
        "flex items-center h-16 border-b border-sidebar-border transition-all duration-300",
        collapsed ? "justify-center px-0" : "px-4 gap-3"
      )}>
        {!collapsed && (
          <>
            <div className="w-9 h-9 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.1)] shrink-0">
              <Trophy className="w-5 h-5 text-[#A855F7]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-sm text-white tracking-tight truncate">
                Ta<span className="text-[#A855F7]">ppr</span> Partner
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A855F7]">{Math.round(PARTNER_COMMISSION_RATE * 100)}% Commission</span>
            </div>
          </>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center justify-center transition-all hover:bg-[#A855F7]/10 hover:text-[#A855F7] cursor-pointer",
            collapsed
              ? "w-10 h-10 rounded-xl bg-[#A855F7]/5 text-[#A855F7] hover:scale-110 active:scale-95"
              : "ml-auto w-8 h-8 rounded-lg text-neutral-500 hover:text-white"
          )}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Back to dashboard */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          title={collapsed ? "Back to Dashboard" : undefined}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/[0.03] transition-all",
            collapsed && "justify-center px-2"
          )}
        >
          <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && "Back to Dashboard"}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/partner" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                isActive
                  ? "bg-[#A855F7]/10 text-[#A855F7] shadow-[inset_0_0_12px_rgba(168,85,247,0.05)]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
              {!collapsed && isActive && <div className="ml-auto w-1 h-1 rounded-full bg-[#C084FC] shadow-[0_0_8px_rgba(192,132,252,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed && "justify-center px-0")}>
          <Avatar className="w-8 h-8 rounded-lg border border-[#A855F7]/20 shrink-0">
            <AvatarFallback className="bg-[#A855F7]/10 text-[#A855F7] text-xs font-black">
              {initials || "P"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
              <p className="text-[10px] text-neutral-500 truncate">{displayEmail}</p>
            </div>
          )}
        </div>
        <button
          onClick={handleSignOut}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full mt-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all flex items-center gap-2",
            collapsed ? "justify-center px-2" : "text-left"
          )}
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}
