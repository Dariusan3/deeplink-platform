"use client";

import { TapprMark } from "@/components/brand/logo";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";

// Signup styled to match the marketing landing — same hairline borders,
// Geist sans + mono microlabels, sharp corners, white primary button.
// Inherits the .landing-root CSS variables in globals.css.

export default function SignupPage() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
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
        data: { full_name: fullName, ...(refCode ? { referral_code: refCode } : {}) },
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
    // Google OAuth round-trips through Supabase and drops the ref code.
    // Stash it in localStorage so /auth/callback can attribute the signup.
    if (refCode) localStorage.setItem("tappr_ref_code", refCode);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  // ── Success state ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="landing-root min-h-screen relative overflow-hidden">
        <div className="hero-glow" aria-hidden />

        <nav className="relative z-10 h-[60px] border-b border-[var(--line)]">
          <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--ink)]">
              <TapprMark className="w-6 h-6 text-[var(--tappr-green)] shrink-0" />
              <span>Tappr</span>
            </Link>
          </div>
        </nav>

        <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-24 flex justify-center">
          <div className="w-full max-w-[440px] text-center">
            <div className="inline-flex w-14 h-14 rounded-sm bg-[var(--green-soft)] border border-[var(--tappr-green)]/30 items-center justify-center mb-8">
              <Mail className="w-6 h-6 text-[var(--tappr-green)]" />
            </div>
            <span className="ulabel mb-4 mx-auto">Confirm your email</span>
            <h1
              className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 0.98 }}
            >
              Check your <span className="text-[var(--tappr-green)]">inbox.</span>
            </h1>
            <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-2">
              We sent a confirmation link to
            </p>
            <p className="font-mono text-[14px] text-[var(--ink)] mb-10 break-all">
              {email}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="btn-lift inline-flex items-center gap-2 px-4 py-2 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              ← Back to sign in
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-root min-h-screen relative overflow-hidden">
      {/* Ambient drifting green-radial — same as landing hero */}
      <div className="hero-glow" aria-hidden />

      {/* Top bar */}
      <nav className="relative z-10 h-[60px] border-b border-[var(--line)]">
        <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <TapprMark className="w-6 h-6 text-[var(--tappr-green)] shrink-0" />
            <span>Tappr</span>
          </Link>
          <Link
            href="/login"
            className="btn-lift inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[12px] text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            Have an account? Sign in →
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-20 flex justify-center">
        <div className="w-full max-w-[440px]">
          {/* Microlabel */}
          <span className="ulabel mb-6">Create account</span>

          {/* Headline */}
          <h1
            className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
            style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95 }}
          >
            Start <span className="text-[var(--tappr-green)]">free.</span>
          </h1>

          <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-8">
            500 clicks/month, no credit card. Set up in 60 seconds.
          </p>

          {refCode && (
            <div className="mb-6 px-4 py-2.5 border border-[var(--tappr-green)]/30 bg-[var(--green-soft)] rounded-sm flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--tappr-green)] shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.06em] text-[var(--ink)]">
                Referred by <span className="text-[var(--tappr-green)] font-semibold">{refCode}</span>
              </span>
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn-lift w-full h-11 flex items-center justify-center gap-3 border border-[var(--line)] hover:border-[var(--line-2)] text-[var(--ink-2)] hover:text-[var(--ink)] rounded-sm text-[13px] font-medium disabled:opacity-50 mb-5"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="currentColor" opacity="0.9" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="var(--tappr-green)" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="var(--tappr-green)" opacity="0.7" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="var(--tappr-green)" opacity="0.85" />
            </svg>
            Sign up with Google
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="px-3 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
              or register with email
            </span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                className="w-full h-11 px-4 bg-transparent border border-[var(--line)] focus:border-[var(--tappr-green)] focus:outline-none text-[var(--ink)] placeholder:text-[var(--muted)] rounded-sm text-[14px] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-11 px-4 bg-transparent border border-[var(--line)] focus:border-[var(--tappr-green)] focus:outline-none text-[var(--ink)] placeholder:text-[var(--muted)] rounded-sm text-[14px] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-11 px-4 pr-11 bg-transparent border border-[var(--line)] focus:border-[var(--tappr-green)] focus:outline-none text-[var(--ink)] placeholder:text-[var(--muted)] rounded-sm text-[14px] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink-2)] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex gap-1 pt-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 transition-all duration-300 ${
                        password.length >= (i + 1) * 3
                          ? password.length >= 10
                            ? "bg-[var(--tappr-green)]"
                            : password.length >= 6
                              ? "bg-amber-400"
                              : "bg-red-500"
                          : "bg-[var(--line)]"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`w-full h-11 px-4 pr-16 bg-transparent border focus:outline-none text-[var(--ink)] placeholder:text-[var(--muted)] rounded-sm text-[14px] transition-colors ${
                    !passwordsMatch
                      ? "border-red-500/50 focus:border-red-500"
                      : confirmPassword && passwordsMatch
                        ? "border-[var(--tappr-green)]/40 focus:border-[var(--tappr-green)]"
                        : "border-[var(--line)] focus:border-[var(--tappr-green)]"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {confirmPassword && passwordsMatch && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--tappr-green)]" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="text-[var(--muted)] hover:text-[var(--ink-2)] transition-colors"
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {!passwordsMatch && (
                <p className="font-mono text-[10px] tracking-[0.06em] uppercase text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            {error && (
              <div className="text-[12px] font-medium text-red-400 bg-red-400/5 border border-red-400/20 rounded-sm px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !passwordsMatch || !passwordStrong}
              className="btn-lift w-full h-11 inline-flex items-center justify-center gap-2 bg-white text-black font-medium rounded-sm hover:bg-[var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Create account →</>
              )}
            </button>
          </form>

          <p className="mt-8 text-[13px] text-[var(--ink-2)]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--tappr-green)] hover:underline underline-offset-4">
              Sign in
            </Link>
          </p>

          {/* Trust line — matches the hero checklist */}
          <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--muted)] font-mono">
            {["No credit card", "500 clicks/mo free", "60-second setup"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 6.5L5 9.5L10 3.5" stroke="var(--tappr-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
