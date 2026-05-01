"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Link2,
  Users,
  Wallet,
  Trophy,
  Megaphone,
  Lightbulb,
  Settings,
  ArrowLeft,
} from "lucide-react";

const NAV = [
  { name: "Overview", href: "/partner", icon: LayoutDashboard },
  { name: "My Link", href: "/partner/link", icon: Link2 },
  { name: "Referrals", href: "/partner/referrals", icon: Users },
  { name: "Earnings", href: "/partner/earnings", icon: Wallet },
  { name: "Leaderboard", href: "/partner/leaderboard", icon: Trophy },
  { name: "Promo Kit", href: "/partner/promo", icon: Megaphone },
  { name: "Suggestions", href: "/partner/suggestions", icon: Lightbulb },
  { name: "Settings", href: "/partner/settings", icon: Settings },
];

export function PartnerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useUser();

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
    <div className="flex flex-col h-full w-64 bg-sidebar border-r border-sidebar-border">
      {/* Header — Tappr logo with partner badge */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,210,106,0.1)]">
          <Trophy className="w-5 h-5 text-[#00D26A]" />
        </div>
        <div className="flex flex-col">
          <span className="font-black text-sm text-white tracking-tight">
            Ta<span className="text-[#00D26A]">ppr</span> Partner
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#00D26A]">25% Commission</span>
        </div>
      </div>

      {/* Back to dashboard */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-white/[0.03] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
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
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all",
                isActive
                  ? "bg-[#00D26A]/10 text-[#00D26A] shadow-[inset_0_0_12px_rgba(0,210,106,0.05)]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
              {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.8)]" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="w-8 h-8 rounded-lg border border-[#00D26A]/20">
            <AvatarFallback className="bg-[#00D26A]/10 text-[#00D26A] text-xs font-black">
              {initials || "P"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-neutral-500 truncate">{displayEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full mt-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all text-left"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
