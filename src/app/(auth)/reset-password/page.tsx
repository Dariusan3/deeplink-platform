"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 2000);
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
          <div className="w-9 h-9 rounded-xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center shadow-[0_0_20px_rgba(0,210,106,0.15)]">
            <svg className="w-5 h-5 text-[#00D26A]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          </div>
          <span className="font-black text-xl text-white tracking-tight">Tappr</span>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-white/6 bg-white/2.5 backdrop-blur-2xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
          <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-[#00D26A]/40 to-transparent" />

          <div className="p-8">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,210,106,0.15)]">
                  <CheckCircle className="w-7 h-7 text-[#00D26A]" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white">Password updated</h1>
                <p className="text-sm text-neutral-400 font-medium">
                  Redirecting you to the dashboard...
                </p>
                <div className="w-4.5 h-4.5 border-2 border-[#00D26A]/30 border-t-[#00D26A] rounded-full animate-spin mx-auto mt-4" />
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-black tracking-tight text-white mb-1">Set new password</h1>
                  <p className="text-sm text-neutral-500 font-medium">Choose a new password for your account</p>
                </div>

                <form onSubmit={handleReset} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-12 bg-white/4 border-white/8 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 text-white placeholder:text-neutral-700 rounded-xl transition-all pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
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
                      "Update Password"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
