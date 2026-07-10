"use client";

import { TapprMark } from "@/components/brand/logo";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

// Dedicated set-new-password screen, styled in the same flat editorial
// language as /login (landing-root variables, hairline borders, mono
// micro-labels). Users land here from the branded recovery/invite email —
// /auth/confirm has already verified the token and set the session, so we
// just collect the new password. If someone arrives without a session
// (expired/used link, direct visit) we show a recovery path instead of a
// form that would fail on submit.

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  // null = checking, true = has session (show form), false = expired link
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        setHasSession(!!data.user);
        setEmail(data.user?.email ?? null);
      } catch {
        if (!cancelled) setHasSession(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async (e: React.FormEvent) => {
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
      }, 2500);
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
            href="/login"
            className="btn-lift inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--line)] hover:border-[var(--line-2)] rounded-sm text-[12px] text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            Back to sign in →
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-24 flex justify-center">
        <div className="w-full max-w-[440px]">
          {/* Checking the session — tiny quiet state, no flash */}
          {hasSession === null && (
            <div className="flex items-center gap-3 text-[var(--ink-2)] text-[13px]">
              <span className="w-4 h-4 border-2 border-[var(--line-2)] border-t-[var(--tappr-green)] rounded-full animate-spin" />
              Checking your reset link…
            </div>
          )}

          {/* Expired / invalid link */}
          {hasSession === false && (
            <>
              <span className="ulabel mb-6">Reset link</span>
              <h1
                className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
                style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95 }}
              >
                Link <span className="text-[var(--tappr-green)]">expired.</span>
              </h1>
              <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-10">
                This reset link is invalid or has already been used. Request a
                fresh one and you&apos;ll be back in within a minute.
              </p>
              <Link
                href="/forgot-password"
                className="btn-lift w-full h-11 inline-flex items-center justify-center gap-2 bg-white text-black font-medium rounded-sm hover:bg-[var(--ink)] text-[14px]"
              >
                Request a new link →
              </Link>
              <p className="mt-8 text-[13px] text-[var(--ink-2)]">
                Remembered your password?{" "}
                <Link href="/login" className="text-[var(--tappr-green)] hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* Success */}
          {hasSession && success && (
            <>
              <span className="ulabel mb-6">All set</span>
              <h1
                className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
                style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95 }}
              >
                Password <span className="text-[var(--tappr-green)]">updated.</span>
              </h1>
              <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-10">
                You&apos;re signed in with your new password. Taking you to the
                dashboard…
              </p>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 border-2 border-[var(--line-2)] border-t-[var(--tappr-green)] rounded-full animate-spin" />
                <Link
                  href="/dashboard"
                  className="text-[13px] text-[var(--tappr-green)] hover:underline underline-offset-4"
                >
                  Go now →
                </Link>
              </div>
            </>
          )}

          {/* Set new password form */}
          {hasSession && !success && (
            <>
              <span className="ulabel mb-6">Reset password</span>
              <h1
                className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-4"
                style={{ fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 0.95 }}
              >
                Set a new <span className="text-[var(--tappr-green)]">password.</span>
              </h1>
              <p className="text-[var(--ink-2)] text-[15px] leading-[1.55] mb-10">
                {email ? (
                  <>Choose a new password for <span className="text-[var(--ink)]">{email}</span>.</>
                ) : (
                  <>Choose a new password for your account.</>
                )}
              </p>

              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm" className="block font-mono text-[10px] tracking-[0.14em] uppercase text-[var(--muted)]">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full h-11 px-4 bg-transparent border border-[var(--line)] focus:border-[var(--tappr-green)] focus:outline-none text-[var(--ink)] placeholder:text-[var(--muted)] rounded-sm text-[14px] transition-colors"
                  />
                </div>

                {error && (
                  <div className="text-[12px] font-medium text-red-400 bg-red-400/5 border border-red-400/20 rounded-sm px-3 py-2.5">
                    {error}
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
                    <>Update password →</>
                  )}
                </button>
              </form>

              {/* Trust line — same vibe as login */}
              <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-[var(--muted)] font-mono">
                {["Minimum 6 characters", "Signs you in instantly"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2 6.5L5 9.5L10 3.5" stroke="var(--tappr-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
