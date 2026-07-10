"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { TapprMark } from "@/components/brand/logo";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 h-125 bg-[#00D26A]/8 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[20%] w-100 h-75 bg-[#00D26A]/4 blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <TapprMark className="w-8 h-8 text-[#00D26A] shrink-0" />
          <span className="font-black text-xl text-white tracking-tight">Tappr</span>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-white/6 bg-white/2.5 backdrop-blur-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#00D26A]/40 to-transparent" />

          <div className="p-8">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,210,106,0.15)]">
                  <Mail className="w-7 h-7 text-[#00D26A]" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white">Check your email</h1>
                <p className="text-sm text-neutral-400 font-medium leading-relaxed">
                  We sent a password reset link to<br />
                  <span className="text-white font-bold">{email}</span>
                </p>
                <p className="text-xs text-neutral-600 font-medium">
                  Didn&apos;t receive it? Check your spam folder or try again.
                </p>
                <div className="pt-4 space-y-3">
                  <Button
                    onClick={() => { setSent(false); setEmail(""); }}
                    variant="ghost"
                    className="w-full h-11 rounded-xl text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-widest"
                  >
                    Try another email
                  </Button>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-[#00D26A] hover:text-[#39FF14] font-black text-xs uppercase tracking-widest transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-black tracking-tight text-white mb-1">Forgot password?</h1>
                  <p className="text-sm text-neutral-500 font-medium">Enter your email and we&apos;ll send you a reset link</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-white/4 border-white/8 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 text-white placeholder:text-neutral-700 rounded-xl transition-all"
                    />
                  </div>

                  {error && (
                    <div className="text-xs font-bold text-red-400 bg-red-400/5 rounded-xl px-4 py-3 border border-red-400/20 animate-in fade-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 btn-primary-pulse rounded-xl text-black font-black uppercase tracking-widest text-xs mt-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="w-4.5 h-4.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white font-bold transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
