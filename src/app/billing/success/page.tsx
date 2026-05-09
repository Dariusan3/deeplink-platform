"use client";

import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,106,0.08),transparent_70%)] pointer-events-none" />

      <div className="glass-card bg-white/[0.01] border-white/5 p-12 rounded-[40px] max-w-lg w-full text-center relative z-10">
        <div className="mx-auto w-24 h-24 rounded-3xl bg-[#00D26A]/10 flex items-center justify-center mb-8 border border-[#00D26A]/20 shadow-[0_0_50px_rgba(0,210,106,0.15)]">
          <CheckCircle2 className="w-12 h-12 text-[#00D26A]" />
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">
          Payment Received
        </h1>

        <p className="text-neutral-400 font-medium mb-10 leading-relaxed">
          Your subscription is being activated. It usually takes a few seconds for the
          plan to flip on the dashboard.
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
