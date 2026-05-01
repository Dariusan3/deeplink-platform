"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeam } from "@/hooks/use-team";
import { useUser } from "@/hooks/use-user";
import { useAnomalyAlerts } from "@/hooks/use-anomaly-alerts";
import { useCollections } from "@/hooks/use-collections";
import { useLinks } from "@/hooks/use-links";
import { CreateTeamDialog } from "@/components/teams/create-team-dialog";
import { Star } from "lucide-react";

// Color tier for the plan badge under the user's name in the sidebar.
// `free` is muted, paid tiers escalate in saturation: starter blue,
// growth Tappr green, agency premium amber.
const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  free: {
    label: "Free",
    className: "bg-neutral-700/50 text-neutral-300 border-neutral-600/40",
  },
  starter: {
    label: "Starter",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  },
  growth: {
    label: "Growth",
    className: "bg-[#00D26A]/10 text-[#00D26A] border-[#00D26A]/30",
  },
  agency: {
    label: "Agency",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
};

function PlanBadge({ plan }: { plan: string }) {
  const style = PLAN_STYLES[plan.toLowerCase()] ?? PLAN_STYLES.free;
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-widest",
        style.className
      )}
    >
      {style.label}
    </span>
  );
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
  {
    name: "Links",
    href: "/dashboard/links",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
    ),
  },
  {
    name: "QR Codes",
    href: "/dashboard/qr-codes",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
      </svg>
    ),
  },
  {
    name: "Collections",
    href: "/dashboard/collections",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
  },
  {
    name: "Teams",
    href: "/dashboard/teams",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    name: "Alerts",
    href: "/dashboard/alerts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
  },
  {
    name: "AI Brain",
    href: "/dashboard/brain",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    badge: "AI",
  },
  {
    name: "A/B Testing",
    href: "/dashboard/ab-testing",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    name: "Developer API",
    href: "/dashboard/developer",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    name: "Contact Support",
    href: "/dashboard/contact",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75a9.707 9.707 0 0 1-2.031 5.951l-.013.017c-.32.448-.805.76-1.348.858l-3.178.547a1.125 1.125 0 0 1-1.302-1.302l.547-3.178c.098-.543.41-1.028.858-1.348l.017-.013A9.707 9.707 0 0 1 21.75 12.75Zm-7.5-3.375a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 9.375a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm-3.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { teams, activeTeam, setActiveTeam } = useTeam();
  const { user, profile } = useUser();
  const { unreadCount } = useAnomalyAlerts();
  const { collections } = useCollections();
  const { links } = useLinks();
  const starredCollections = collections.filter((c) => c.is_starred);
  const favoriteLinks = links.filter((l) => l.is_favorite);
  const isPartner = profile?.is_partner === true;

  const displayName = profile?.full_name || user?.user_metadata?.full_name || "User";
  const displayEmail = profile?.email || user?.email || "user@example.com";
  const initials = displayName
    .split(" ")
    .map((n: string) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-sidebar-border transition-all duration-300",
        collapsed ? "justify-center px-0" : "px-4 gap-3"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="w-9 h-9 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,210,106,0.1)]">
              <svg className="w-5 h-5 text-[#00D26A]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <span className="font-black text-xl text-white tracking-tighter">
              Ta<span className="text-[#00D26A]">ppr</span>
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "transition-all duration-300 hover:bg-[#00D26A]/10 hover:text-[#00D26A]",
            collapsed 
              ? "w-10 h-10 rounded-xl bg-[#00D26A]/5 text-[#00D26A] hover:scale-110 active:scale-95" 
              : "ml-auto w-8 h-8 text-neutral-500 hover:text-white"
          )}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </Button>
      </div>

      {/* Team Switcher */}
      <div className="px-3 py-4 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger
            id="sidebar-team-switcher-trigger"
            render={
              <button
                className={cn(
                  "flex items-center gap-3 w-full p-2 rounded-xl transition-all duration-300 hover:bg-white/[0.03] group",
                  collapsed ? "justify-center" : "justify-start"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,210,106,0.1)] group-hover:bg-[#00D26A]/20 transition-all">
                  <span className="text-xs font-black text-[#00D26A]">
                    {activeTeam?.name?.charAt(0).toUpperCase() || "T"}
                  </span>
                </div>
                {!collapsed && (
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-xs font-black text-white truncate max-w-[140px]">
                      {activeTeam?.name || "Select Team"}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      Active Unit
                    </span>
                  </div>
                )}
                {!collapsed && (
                  <svg className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                )}
              </button>
            }
          />
          <DropdownMenuContent align="start" className="w-64 glass-card bg-black/95 border-white/5 shadow-2xl p-2">
            <div className="px-2 py-1.5 mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                Switch Operational Units
              </span>
            </div>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all mb-1",
                  activeTeam?.id === team.id 
                    ? "bg-[#00D26A]/10 text-[#00D26A]" 
                    : "text-neutral-400 hover:text-white hover:bg-white/5"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black border",
                  activeTeam?.id === team.id 
                    ? "bg-[#00D26A]/10 border-[#00D26A]/20" 
                    : "bg-white/5 border-white/5"
                )}>
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold">{team.name}</span>
                {activeTeam?.id === team.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/5 my-2" />
            <CreateTeamDialog 
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer text-[#00D26A] hover:bg-[#00D26A]/10 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Establish New Team
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Partner CTA — only visible when activated */}
      {isPartner && (
        <div className="px-3 pt-3">
          <Link
            href="/partner"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
              "bg-gradient-to-r from-[#00D26A]/15 to-[#39FF14]/10 border border-[#00D26A]/30 text-[#00D26A] hover:from-[#00D26A]/25 hover:to-[#39FF14]/15 shadow-[0_0_20px_rgba(0,210,106,0.15)]",
              collapsed && "justify-center px-2"
            )}
            title="Partner Dashboard"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {!collapsed && (
              <>
                <span>Partner</span>
                <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[#00D26A] text-black tracking-widest">25%</span>
              </>
            )}
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          // Dashboard root must match exactly — otherwise every nested
          // page (/dashboard/links, /dashboard/qr-codes, etc.) would also
          // light it up next to the real active section.
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-300",
                isActive
                  ? "bg-[#00D26A]/10 text-[#00D26A] shadow-[inset_0_0_12px_rgba(0,210,106,0.05)]"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03]",
                collapsed && "justify-center px-2"
              )}
            >
              <span className={cn("shrink-0 transition-colors duration-300", isActive ? "text-[#00D26A]" : "group-hover:text-neutral-300")}>{item.icon}</span>
              {!collapsed && <span>{item.name}</span>}
              {!collapsed && item.name === "Alerts" && unreadCount > 0 && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 tracking-wider animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              {!collapsed && (item as { badge?: string }).badge && (
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#00D26A]/20 text-[#00D26A] border border-[#00D26A]/30 tracking-wider">
                  {(item as { badge?: string }).badge}
                </span>
              )}
              {isActive && !collapsed && !(item as { badge?: string }).badge && item.name !== "Alerts" && (
                <div className="ml-auto w-1 h-1 rounded-full bg-[#39FF14] shadow-[0_0_8px_rgba(57,255,20,0.8)]" />
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger 
                  id={`sidebar-tooltip-trigger-${item.name.toLowerCase()}`} 
                  render={linkContent} 
                />
                <TooltipContent side="right" className="font-medium">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}

        {/* Favorite Links */}
        {!collapsed && favoriteLinks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 px-3 mb-2">
              Favorites
            </p>
            {favoriteLinks.map((link) => (
              <Link
                key={link.id}
                href={`/dashboard/analytics?linkId=${link.id}`}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03] transition-all"
              >
                <Star className="w-3 h-3 shrink-0 text-amber-400" fill="currentColor" />
                <span className="truncate">{link.title || link.slug}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Starred Collections */}
        {!collapsed && starredCollections.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600 px-3 mb-2">
              Starred
            </p>
            {starredCollections.map((col) => {
              const colPath = `/dashboard/collections`;
              return (
                <Link
                  key={col.id}
                  href={colPath}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.03] transition-all"
                >
                  <div
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: col.color || "#00D26A" }}
                  />
                  <span className="truncate">{col.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <Separator className="opacity-50" />

      {/* User menu */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            id="sidebar-user-menu-trigger"
            data-slot="button"
            render={
              <button
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full gap-3 h-auto py-2.5 px-3 justify-start hover:bg-accent/50",
                  collapsed && "justify-center px-2"
                )}
              />
            }
          >
            <Avatar className="w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-[#00D26A]/20">
              <AvatarFallback className="bg-[#00D26A]/10 text-[#00D26A] text-xs font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col items-start text-left min-w-0">
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  {activeTeam?.plan && <PlanBadge plan={activeTeam.plan} />}
                </div>
                <span className="text-xs text-muted-foreground truncate w-full">{displayEmail}</span>
              </div>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              nativeButton={false}
              render={<Link href="/dashboard/settings" className="w-full" />}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              nativeButton={false}
              render={<Link href="/dashboard/billing" className="w-full" />}
            >
              Billing
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              nativeButton={true}
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive"
              render={<button className="w-full text-left" />}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Mobile sidebar using Sheet component
export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger
        id="mobile-sidebar-trigger"
        data-slot="button"
        nativeButton={true}
        render={
          <button
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
          />
        }
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
