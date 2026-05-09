"use client";

import { useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TeamContext } from "@/providers/team-provider";
import { UserContext } from "@/providers/user-provider";
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
  // The pricing page is statically prerendered and rendered outside the
  // dashboard providers — so we read the contexts raw and treat "undefined"
  // (no provider) the same as "not signed in": send the visitor to /signup.
  const teamCtx = useContext(TeamContext);
  const userCtx = useContext(UserContext);
  const activeTeam = teamCtx?.activeTeam ?? null;
  const user = userCtx?.user ?? null;
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!user || !activeTeam) {
      // Either not signed in, or signed in but viewing /pricing (no team
      // context). Either way, push to signup — after auth the dashboard
      // wraps them in a TeamProvider and they can come back here.
      router.push("/signup");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: activeTeam.id, plan }),
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
