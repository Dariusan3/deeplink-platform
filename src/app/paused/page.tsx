"use client";

import { motion } from "framer-motion";
import { ShieldAlert, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TapprMark } from "@/components/brand/logo";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PausedContent() {
  // Branding flag passed by [slug]/route.ts when team_settings.show_branding
  // is false. Defaults to ON (free tier always shows branding).
  const showBranding = useSearchParams().get("branding") !== "0";
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Polish */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,106,0.05),transparent_70%)]" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00D26A]/5 blur-[120px] rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#00D26A]/5 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-card bg-white/[0.01] border-white/5 p-12 rounded-[40px] max-w-lg w-full text-center relative z-10"
      >
        <div className="mx-auto w-24 h-24 rounded-3xl bg-[#00D26A]/5 flex items-center justify-center mb-8 border border-[#00D26A]/10 shadow-[0_0_50px_rgba(0,210,106,0.1)]">
          <ShieldAlert className="w-12 h-12 text-[#00D26A] animate-pulse" />
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">
          Link Deactivated
        </h1>
        
        <p className="text-neutral-400 font-medium mb-12 leading-relaxed">
          The distribution node you are trying to access has been <span className="text-[#00D26A] font-bold">temporarily paused</span> or decommissioning is in progress.
        </p>

        <div className="space-y-4">
          <Button 
            render={<Link href="/" />}
            nativeButton={false}
            className="w-full btn-primary h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,210,106,0.2)]"
          />
          
          {showBranding && (
            <p className="text-[10px] text-neutral-600 font-black uppercase tracking-[0.3em]">
              Tappr Neural Protection Active
            </p>
          )}
        </div>
      </motion.div>

      {/* Footer Branding — hidden when team_settings.show_branding is off (premium) */}
      {showBranding && (
        <div className="mt-12 relative z-10 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-500">
          <TapprMark className="w-6 h-6 text-[#00D26A] shrink-0" />
          <span className="text-white font-black uppercase text-[10px] tracking-widest italic">Tappr.me</span>
        </div>
      )}
    </div>
  );
}

export default function PausedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin" />
      </div>
    }>
      <PausedContent />
    </Suspense>
  );
}
