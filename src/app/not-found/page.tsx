"use client";

import { motion } from "framer-motion";
import { SearchX, Home, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TapprMark } from "@/components/brand/logo";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Polish */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,106,0.03),transparent_80%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00D26A]/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-card bg-white/[0.01] border-white/5 p-12 rounded-[48px] max-w-lg w-full text-center relative z-10"
      >
        <div className="mx-auto w-24 h-24 rounded-3xl bg-red-500/5 flex items-center justify-center mb-8 border border-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
          <SearchX className="w-12 h-12 text-red-500 animate-pulse" />
        </div>

        <h1 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase italic leading-none">
          Link Not Found
        </h1>
        
        <p className="text-neutral-500 font-medium mb-12 leading-relaxed">
          The distribution node you are looking for does not exist in our neural registry. It may have been <span className="text-white">deleted</span> or the <span className="text-white">URL is mistyped</span>.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <Button 
            render={(
              <Link href="/">
                <Home className="w-4 h-4 mr-2 inline" />
                Return Home
              </Link>
            )}
            nativeButton={false}
            className="w-full btn-primary h-14 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,210,106,0.2)]"
          />
          
          <Button 
            render={(
              <Link href="/dashboard/links">
                <PlusCircle className="w-4 h-4 mr-2 inline" />
                Create This Link
              </Link>
            )}
            nativeButton={false}
            variant="ghost"
            className="w-full h-14 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] text-neutral-400 hover:text-white hover:bg-white/5"
          />
        </div>
      </motion.div>

      {/* Footer Branding */}
      <div className="mt-12 relative z-10 flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity duration-500">
        <TapprMark className="w-6 h-6 text-[#00D26A] shrink-0" />
        <span className="text-white font-black uppercase text-[10px] tracking-widest italic">Tappr.me</span>
      </div>
    </div>
  );
}
