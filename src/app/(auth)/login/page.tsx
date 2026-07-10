"use client";

import { TapprMark } from "@/components/brand/logo";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// Login styled in the same flat, editorial language as the marketing
// landing — hairline borders, sharp corners, Geist sans + mono micro-
// labels, big tight-tracking headline, white primary button. Inherits
// the .landing-root CSS variables in globals.css.

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when Supabase rejects a login because the email isn't verified —
  // drives the "resend confirmation" affordance instead of a dead-end error.
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsConfirm(false);
    setResent(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Supabase blocks unverified accounts with "Email not confirmed" when
      // "Confirm email" is enabled. Surface a friendly path to re-send it.
      if (/not confirmed|not verified/i.test(error.message)) {
        setNeedsConfirm(true);
        setError("Please confirm your email before signing in.");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (error) {
      setError(error.message);
    } else {
      setResent(true);
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
            href="/signup"
            className="btn-lift inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[12px] text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            No account? Start free →
          </Link>
        </div>
      </nav>

      {/* Form */}
      <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-24 flex justify-center">
        <div className="w-full max-w-[440px]">
          {/* Microlabel */}
          <span className="ulabel mb-6">Sign in</span>

          {/* Headline */}
          <h1
            className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
            style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95 }}
          >
            Welcome <span className="text-[var(--tappr-green)]">back.</span>
          </h1>

          <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-10">
            Two seconds and you&apos;re back in the dashboard.
          </p>

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
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-1 h-px bg-[var(--line)]" />
            <span className="px-3 font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
              or use email
            </span>
            <div className="flex-1 h-px bg-[var(--line)]" />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
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
              <div className="flex items-baseline justify-between">
                <label htmlFor="password" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--ink-2)] hover:text-[var(--tappr-green)] transition-colors"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
            </div>

            {error && !needsConfirm && (
              <div className="text-[12px] font-medium text-red-400 bg-red-400/5 border border-red-400/20 rounded-sm px-3 py-2.5">
                {error}
              </div>
            )}

            {needsConfirm && (
              <div className="text-[12px] font-medium rounded-sm px-3 py-2.5 border border-[var(--tappr-green)]/25 bg-[var(--tappr-green)]/5 text-[var(--ink-2)]">
                {resent ? (
                  <span className="text-[var(--tappr-green)]">
                    Confirmation email sent to {email} — check your inbox.
                  </span>
                ) : (
                  <div className="flex flex-col gap-2">
                    <span>Please confirm your email before signing in.</span>
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resending}
                      className="self-start font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--tappr-green)] hover:underline underline-offset-4 disabled:opacity-50"
                    >
                      {resending ? "Sending…" : "Resend confirmation email →"}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-lift w-full h-11 inline-flex items-center justify-center gap-2 bg-white text-black font-medium rounded-sm hover:bg-[var(--ink)] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Sign in →</>
              )}
            </button>
          </form>

          {/* Footer line */}
          <p className="mt-8 text-[13px] text-[var(--ink-2)]">
            No account yet?{" "}
            <Link href="/signup" className="text-[var(--tappr-green)] hover:underline underline-offset-4">
              Create one free
            </Link>
          </p>

          {/* Trust line — same vibe as the hero checklist */}
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
