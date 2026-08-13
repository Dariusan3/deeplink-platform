"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TapprMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";
import { normalizeCode } from "@/lib/partner-codes";
import { Loader2, Ticket } from "lucide-react";

const STORAGE_KEY = "tappr_ref_code";

// Tappr is referral-only. This screen is what you get instead of a signup form
// when you arrive without a code, and it is the same screen an already-created
// account sees while its `signup_status` is 'pending_referral'.
//
// Two modes because the two situations need different verbs:
//
//   "signup" — anonymous visitor on /signup. A valid code sends them to
//              /signup/<code>, the normal referral path, which also records the
//              click for the partner.
//   "claim"  — signed-in but quarantined account on /welcome. The code is
//              attached to the existing account, which releases the gate.
export function InviteGate({
  mode,
  initialCode,
}: {
  mode: "signup" | "claim";
  initialCode?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [autoTried, setAutoTried] = useState(mode !== "claim");
  const [error, setError] = useState<string | null>(null);

  // On /welcome, try the code already sitting in localStorage before showing
  // anyone an input. A Google user who arrived through a referral link has it
  // stashed by ReferralTracker and should never be asked to type anything —
  // their code was dropped by the OAuth round trip, not by them.
  useEffect(() => {
    if (mode !== "claim" || autoTried) return;

    const stored = initialCode || (() => {
      try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
    })();

    if (!stored) {
      setAutoTried(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const ok = await claim(stored);
      if (cancelled) return;
      if (!ok) setAutoTried(true);
    })();
    return () => { cancelled = true; };
  }, [mode, autoTried, initialCode]);

  async function claim(raw: string): Promise<boolean> {
    const value = normalizeCode(raw);
    if (!value) return false;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/partner/claim-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.claimed) {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        // Full navigation, not router.push: the middleware has to re-read
        // signup_status to let the dashboard through, and a client-side
        // transition would reuse the cached gate decision.
        window.location.href = "/dashboard";
        return true;
      }
      setError("That code isn't valid. Ask whoever invited you for their link.");
      return false;
    } catch {
      setError("Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function check(raw: string) {
    const value = normalizeCode(raw);
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/validate-code?code=${encodeURIComponent(value)}`);
      const data = await res.json().catch(() => ({}));
      if (data.valid) {
        router.push(`/signup/${value}`);
        return;
      }
      setError("That code isn't valid. Ask whoever invited you for their link.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "claim") claim(code);
    else check(code);
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  // While the stored code is being tried, show nothing but a spinner. Flashing
  // "you need an invite" at someone who has a perfectly good invite is the one
  // thing this screen must not do.
  if (mode === "claim" && !autoTried) {
    return (
      <div className="landing-root min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--tappr-green)]" />
      </div>
    );
  }

  return (
    <div className="landing-root min-h-dvh relative overflow-hidden">
      <div className="hero-glow" aria-hidden />

      <nav className="relative z-10 h-[60px] border-b border-[var(--line)]">
        <div className="max-w-[1280px] mx-auto h-full px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <TapprMark className="w-6 h-6 text-[var(--tappr-green)] shrink-0" />
            <span>Tappr</span>
          </Link>
          {mode === "claim" ? (
            <button onClick={signOut} className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              Sign out
            </button>
          ) : (
            <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              Log in
            </Link>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-24 flex justify-center">
        <div className="w-full max-w-[420px]">
          <div className="w-11 h-11 rounded-xl border border-[var(--line)] flex items-center justify-center mb-6">
            <Ticket className="w-5 h-5 text-[var(--tappr-green)]" />
          </div>

          <h1 className="text-2xl font-semibold text-[var(--ink)] mb-2">
            Tappr is invite-only
          </h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-8">
            {mode === "claim"
              ? "Your account is ready — it just needs the invite code from whoever sent you here."
              : "You get in through someone's referral link. If you have their code, enter it below."}
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="invite-code" className="block text-xs font-mono uppercase tracking-widest text-[var(--muted)] mb-2">
                Invite code
              </label>
              <input
                id="invite-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="their-code"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full h-12 px-4 rounded-lg border border-[var(--line)] bg-transparent text-[var(--ink)] font-mono text-sm outline-none focus:border-[var(--tappr-green)] transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy || normalizeCode(code).length === 0}
              className="w-full h-12 rounded-lg bg-[var(--ink)] text-[var(--bg)] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </form>

          <p className="text-xs text-[var(--muted)] mt-6 leading-relaxed">
            Don&apos;t have a code? Tappr partners share them — ask the person who
            told you about it.
          </p>
        </div>
      </main>
    </div>
  );
}
