"use client";

import { useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TeamContext } from "@/providers/team-provider";
import { UserContext } from "@/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Calls /api/billing/checkout for the active team and bounces the user to
// the FanBasis hosted checkout page. If the user isn't logged in we send
// them to /signup so they can come back and pay.

export function UpgradeButton({
  plan,
  children,
  className,
  variant,
}: {
  plan: "starter" | "growth" | "agency";
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  // The pricing page is statically prerendered and rendered OUTSIDE the
  // dashboard providers — so TeamContext is undefined there. We can still
  // detect auth via Supabase directly (cookies are shared), and the
  // checkout endpoint figures out the team server-side. This avoids the
  // old bug where logged-in users on /pricing got bounced to /signup →
  // middleware → /dashboard, instead of starting checkout.
  const teamCtx = useContext(TeamContext);
  const userCtx = useContext(UserContext);
  const ctxUser = userCtx?.user ?? null;
  const ctxTeam = teamCtx?.activeTeam ?? null;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Mirror the auth state from supabase when we're rendered without a
  // UserProvider (e.g. on the public /pricing page). When the dashboard
  // provider IS present, ctxUser is already populated and this effect
  // is a no-op.
  const [supaUserId, setSupaUserId] = useState<string | null>(null);
  useEffect(() => {
    if (ctxUser) return; // dashboard context wins
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!cancelled) setSupaUserId(data.user?.id ?? null);
      } catch {
        // Network/auth hiccup (AuthRetryableFetchError) — treat as
        // logged-out; the click handler falls back to /signup.
        if (!cancelled) setSupaUserId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [ctxUser]);
  const isAuthed = !!ctxUser || !!supaUserId;

  const handleClick = async () => {
    if (!isAuthed) {
      // Truly logged out — push to signup so they create an account.
      router.push("/signup");
      return;
    }

    setLoading(true);
    try {
      // team_id is optional. When ctxTeam exists (dashboard /billing), we
      // send it. Otherwise the endpoint picks the user's owned team.
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ctxTeam ? { team_id: ctxTeam.id, plan } : { plan }),
      });
      const json = await res.json();
      if (!res.ok || !json.payment_link) {
        toast.error(json.error || "Could not start checkout");
        setLoading(false);
        return;
      }
      // Replace, not push — we don't want the user to come back to a stale
      // checkout via the back button.
      window.location.replace(json.payment_link);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant={variant}
      className={cn(className)}
    >
      {loading ? "Redirecting…" : children}
    </Button>
  );
}
