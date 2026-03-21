"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const passwordsMatch = confirmPassword === "" || password === confirmPassword;
  const passwordStrong = password.length >= 6;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 h-125 bg-[#00D26A]/8 blur-[140px] rounded-full" />
        </div>
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#00D26A]/10 border border-[#00D26A]/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,210,106,0.2)]">
            <Mail className="w-8 h-8 text-[#00D26A]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Check your inbox</h2>
          <p className="text-neutral-500 text-sm font-medium mb-1">We sent a confirmation link to</p>
          <p className="text-[#00D26A] font-black text-sm mb-8">{email}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 h-125 bg-[#00D26A]/8 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[20%] w-100 h-75 bg-[#00D26A]/4 blur-[100px] rounded-full" />
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
            <div className="mb-8">
              <h1 className="text-2xl font-black tracking-tight text-white mb-1">Create account</h1>
              <p className="text-sm text-neutral-500 font-medium">Join the next generation of deep linking</p>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/4 hover:bg-white/8 hover:border-white/20 text-white text-sm font-bold transition-all duration-200 disabled:opacity-50 mb-6"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="white" opacity="0.9" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#00D26A" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#00D26A" opacity="0.7" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#00D26A" opacity="0.85" />
              </svg>
              Sign up with Google
            </button>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/6" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#050505] px-3 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-600">or register with email</span>
              </div>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="h-12 bg-white/4 border-white/8 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 text-white placeholder:text-neutral-700 rounded-xl transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/4 border-white/8 focus:border-[#00D26A]/50 focus:ring-1 focus:ring-[#00D26A]/20 text-white placeholder:text-neutral-700 rounded-xl transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
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
                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="flex gap-1 pt-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${
                          password.length >= (i + 1) * 3
                            ? password.length >= 10 ? "bg-[#00D26A]" : password.length >= 6 ? "bg-amber-400" : "bg-red-500"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[11px] font-black uppercase tracking-[0.15em] text-neutral-500">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={`h-12 bg-white/4 border-white/8 focus:ring-1 text-white placeholder:text-neutral-700 rounded-xl transition-all pr-11 ${
                      !passwordsMatch
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                        : confirmPassword && passwordsMatch
                        ? "border-[#00D26A]/50 focus:border-[#00D26A]/50 focus:ring-[#00D26A]/20"
                        : "focus:border-[#00D26A]/50 focus:ring-[#00D26A]/20"
                    }`}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {confirmPassword && passwordsMatch && (
                      <CheckCircle2 className="w-4 h-4 text-[#00D26A]" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="text-neutral-600 hover:text-neutral-300 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {!passwordsMatch && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Passwords do not match</p>
                )}
              </div>

              {error && (
                <div className="text-xs font-bold text-red-400 bg-red-400/5 rounded-xl px-4 py-3 border border-red-400/20 animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 btn-primary-pulse rounded-xl text-black font-black uppercase tracking-widest text-xs mt-2"
                disabled={loading || !passwordsMatch || !passwordStrong}
              >
                {loading ? (
                  <div className="w-4.5 h-4.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-neutral-600 font-medium mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[#00D26A] hover:text-[#39FF14] font-black transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
