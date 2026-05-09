"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)] pointer-events-none" />

      <div className="glass-card bg-white/[0.01] border-white/5 p-12 rounded-[40px] max-w-lg w-full text-center relative z-10">
        <div className="mx-auto w-24 h-24 rounded-3xl bg-neutral-700/40 flex items-center justify-center mb-8 border border-white/5">
          <XCircle className="w-12 h-12 text-neutral-400" />
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">
          Checkout Cancelled
        </h1>

        <p className="text-neutral-400 font-medium mb-10 leading-relaxed">
          No charge was made. You can pick a plan again whenever you&apos;re ready.
        </p>

        <div className="space-y-3">
          <Button
            render={<Link href="/pricing" />}
            nativeButton={false}
            className="w-full btn-primary h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em]"
          >
            Back to Pricing
          </Button>
          <Button
            render={<Link href="/dashboard" />}
            nativeButton={false}
            variant="outline"
            className="w-full h-12 rounded-2xl border-white/10 bg-white/[0.02] font-bold uppercase text-[10px] tracking-widest hover:bg-white/[0.05]"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
