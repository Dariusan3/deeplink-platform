"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Shield,
  ArrowLeft,
  Lock,
  ScrollText,
} from "lucide-react";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || "tappr2026";

const adminNav = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Activity Log", href: "/admin/activity", icon: ScrollText },
  { name: "Users & Teams", href: "/admin/users", icon: Users },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  // Check if PIN was already verified in this session
  useEffect(() => {
    const stored = sessionStorage.getItem("tappr_admin_pin");
    if (stored === "verified") setPinVerified(true);
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/dashboard");
        return;
      }
      setIsAdmin(true);
    }
    checkAdmin();
  }, [supabase, router]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setPinVerified(true);
      sessionStorage.setItem("tappr_admin_pin", "verified");
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
    }
  };

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  // PIN gate — even if admin, must enter PIN first
  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Access</h1>
            <p className="text-sm text-neutral-500 mt-1">Enter the admin PIN to continue</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Enter PIN"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
              autoFocus
              className={cn(
                "h-12 text-center text-lg font-black tracking-[0.3em] bg-white/[0.03] border-white/10 rounded-xl",
                pinError && "border-red-500/50 shake"
              )}
            />
            {pinError && (
              <p className="text-xs font-bold text-red-400 text-center">Wrong PIN. Try again.</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-xs rounded-xl"
            >
              <Shield className="w-4 h-4 mr-2" />
              Unlock Admin Panel
            </Button>
          </form>

          <div className="text-center mt-6">
            <Link
              href="/dashboard"
              className="text-[10px] font-bold text-neutral-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
