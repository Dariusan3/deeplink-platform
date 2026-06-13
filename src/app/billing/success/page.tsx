"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const params = useSearchParams();
  const teamId = params.get("team_id");
  const plan = params.get("plan");

  // Activation state. The FanBasis webhook arrives with empty payloads,
  // so we activate from this trusted redirect instead — team_id + plan
  // are the exact values we set on the checkout's success_url.
  const [state, setState] = useState<"activating" | "done" | "error">(
    teamId && plan ? "activating" : "done"
  );

  useEffect(() => {
    if (!teamId || !plan) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team_id: teamId, plan }),
        });
        if (cancelled) return;
        setState(res.ok ? "done" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [teamId, plan]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,106,0.08),transparent_70%)] pointer-events-none" />

      <div className="glass-card bg-white/[0.01] border-white/5 p-12 rounded-[40px] max-w-lg w-full text-center relative z-10">
        <div className={`mx-auto w-24 h-24 rounded-3xl flex items-center justify-center mb-8 border ${
          state === "error"
            ? "bg-amber-500/10 border-amber-500/20"
            : "bg-[#00D26A]/10 border-[#00D26A]/20 shadow-[0_0_50px_rgba(0,210,106,0.15)]"
        }`}>
          {state === "activating" ? (
            <Loader2 className="w-12 h-12 text-[#00D26A] animate-spin" />
          ) : state === "error" ? (
            <AlertCircle className="w-12 h-12 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-12 h-12 text-[#00D26A]" />
          )}
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">
          {state === "activating" ? "Activating…" : state === "error" ? "Almost there" : "Plan Active"}
        </h1>

        <p className="text-neutral-400 font-medium mb-10 leading-relaxed">
          {state === "activating"
            ? "We're switching your plan on now — one moment."
            : state === "error"
              ? "Payment received. If your plan doesn't show up in a minute, refresh the billing page or contact support."
              : `Your ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : ""} plan is live. Everything's unlocked on the dashboard.`}
        </p>

        <Button
          render={<Link href="/dashboard/billing" />}
          nativeButton={false}
          className="w-full btn-primary h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,210,106,0.2)]"
        >
          Go to Billing
        </Button>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
