"use client";

import { Suspense, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { InviteGate } from "@/components/auth/invite-gate";
import { normalizeCode } from "@/lib/partner-codes";
import { Loader2 } from "lucide-react";

const STORAGE_KEY = "tappr_ref_code";

// /signup — referral-only.
//
// A code can reach this page two ways: `?ref=CODE` on the URL (old shared
// links), or localStorage, stashed by ReferralTracker when the visitor landed
// on the marketing site through a partner link. Without either, the signup form
// is replaced by the invite gate.
//
// The clean path-based link lives at /signup/CODE (see ./[code]/page.tsx) and
// never lands here.
//
// This is funnel shaping, not the enforcement. Account creation runs
// client-side against Supabase with the public anon key, so the real gate is
// `users.signup_status` — see supabase/migrations/029_referral_gate.sql.
// localStorage is not readable on the server, and reading it during the first
// client render would break hydration. useSyncExternalStore models it honestly:
// the server (and the hydration pass) sees UNKNOWN and renders a spinner, then
// React re-reads on the client and we know the answer.
//
// The spinner matters. Flashing "you need an invite" at somebody who does have
// one — for a single frame, before storage is read — is the one thing this page
// must never do.
const UNKNOWN = Symbol("unknown");

const subscribeToStorage = () => () => {};
const readStoredCode = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage — fall through to the gate.
    return null;
  }
};
const serverSnapshot = (): typeof UNKNOWN => UNKNOWN;

function SignupResolver() {
  const queryRef = useSearchParams().get("ref");
  const stored = useSyncExternalStore<string | null | typeof UNKNOWN>(
    subscribeToStorage,
    readStoredCode,
    serverSnapshot
  );

  if (queryRef) return <SignupForm refCode={normalizeCode(queryRef)} />;

  if (stored === UNKNOWN) {
    return (
      <div className="landing-root min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--tappr-green)]" />
      </div>
    );
  }

  return stored ? <SignupForm refCode={normalizeCode(stored)} /> : <InviteGate mode="signup" />;
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="landing-root min-h-dvh flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--tappr-green)]" />
        </div>
      }
    >
      <SignupResolver />
    </Suspense>
  );
}
