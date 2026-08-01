"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { TapprMark } from "@/components/brand/logo";
import { HCaptcha } from "@/components/ui/hcaptcha";
import { CheckCircle2, Sparkles, ArrowRight, Lock } from "lucide-react";

// Referral onboarding funnel, shown ONLY when someone arrives via a partner
// link (/signup/@CODE). Three steps:
//   1. congrats — "for 2 weeks you have access, press continue"
//   2. pricing  — the free plan (relabelled "Free Trial") is highlighted and
//                 the only one with a price + CTA; the paid tiers show no price,
//                 so the eye lands on the free signup.
//   3. signup   — the normal SignupForm, with the referral code attached.
//
// "2 weeks free" is messaging only — the referred user lands on the normal free
// plan (per product decision), just framed as a trial to reduce signup friction.

type Tier = {
  name: string;
  blurb: string;
  features: string[];
  free: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free Trial",
    blurb: "Full access for 2 weeks, then free forever.",
    features: [
      "500 clicks / month · 5 links",
      "Automatic deep linking (100+ apps)",
      "AI Brain — 10 chats / mo",
      "Real-time analytics",
    ],
    free: true,
  },
  { name: "Starter", blurb: "For solo entrepreneurs starting smart.", features: ["50,000 clicks / mo · 500 links", "Smart routing — geo + device", "Unlimited AI Brain + all alerts"], free: false },
  { name: "Growth", blurb: "For businesses that scale.", features: ["250,000 clicks / mo · 5,000 links", "Advanced routing", "Remove Tappr branding + API"], free: false },
  { name: "Agency", blurb: "For agencies at volume.", features: ["Unlimited clicks · links · team", "Everything in Growth, unmetered", "Priority support"], free: false },
];

export function ReferralOnboarding({ refCode }: { refCode: string | null }) {
  const [step, setStep] = useState<"congrats" | "pricing" | "signup">("congrats");

  // Final step is the real signup form — referral code flows straight through.
  if (step === "signup") return <SignupForm refCode={refCode} />;

  return (
    <div className="landing-root min-h-screen relative overflow-hidden">
      <div className="hero-glow" aria-hidden />

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

      {step === "congrats" ? (
        <CongratsStep refCode={refCode} onContinue={() => setStep("pricing")} />
      ) : (
        <PricingStep onRegister={() => setStep("signup")} />
      )}
    </div>
  );
}

function CongratsStep({ refCode, onContinue }: { refCode: string | null; onContinue: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleVerify = useCallback((t: string) => { setToken(t); setErr(null); }, []);
  const handleExpire = useCallback(() => setToken(null), []);

  // Gate Continue behind the CAPTCHA — verify the token server-side (the widget
  // alone is spoofable) before advancing the funnel, so bots can't walk into
  // signup.
  const handleContinue = async () => {
    if (!token) { setErr("Please complete the check below."); return; }
    setVerifying(true);
    setErr(null);
    try {
      const res = await fetch("/api/verify-captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) onContinue();
      else { setErr("Verification failed — please try again."); setToken(null); }
    } catch {
      setErr("Network error — please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-24 flex justify-center">
      <div className="w-full max-w-[480px] text-center">
        {/* Logo — replaces the old icon box + "You've been invited" label. */}
        <div className="inline-flex items-center gap-2 mb-9">
          <TapprMark className="w-9 h-9 text-[var(--tappr-green)] shrink-0" />
          <span className="text-[24px] font-semibold text-[var(--ink)] tracking-[-0.02em]">Tappr</span>
        </div>

        <h1
          className="font-semibold text-[var(--ink)] tracking-[-0.04em] mb-5"
          style={{ fontSize: "clamp(38px, 5.5vw, 60px)", lineHeight: 0.98 }}
        >
          Congratulations —<br />
          <span className="text-[var(--tappr-green)]">2 weeks free.</span>
        </h1>

        <p className="text-[var(--ink-2)] text-[16px] leading-[1.6] mb-8 max-w-[400px] mx-auto">
          You&apos;ve got full access to Tappr for the next 2 weeks. Complete the
          quick check, then continue to set up your account.
        </p>

        <div className="mb-5">
          <HCaptcha onVerify={handleVerify} onExpire={handleExpire} />
        </div>

        {err && (
          <p className="mb-4 font-mono text-[11px] tracking-[0.04em] text-red-400">{err}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={verifying || !token}
          className="btn-lift inline-flex items-center justify-center gap-2 px-6 h-12 bg-white text-black font-medium rounded-sm hover:bg-[var(--ink)] text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifying ? "Checking…" : <>Continue <ArrowRight className="w-4 h-4" /></>}
        </button>

        {refCode && (
          <p className="mt-8 font-mono text-[11px] tracking-[0.06em] text-[var(--muted)]">
            Invited via <span className="text-[var(--tappr-green)]">{refCode}</span>
          </p>
        )}
      </div>
    </main>
  );
}

function PricingStep({ onRegister }: { onRegister: () => void }) {
  return (
    <main className="relative z-10 max-w-[1280px] mx-auto px-6 py-16 lg:py-20">
      <div className="text-center mb-14">
        <span className="ulabel mb-4 mx-auto">Your plan</span>
        <h1
          className="font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[720px] mx-auto"
          style={{ fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 1 }}
        >
          Start your <span className="text-[var(--tappr-green)]">free trial.</span>
        </h1>
        <p className="mt-4 text-[var(--ink-2)] text-[15px] max-w-[440px] mx-auto leading-[1.55]">
          2 weeks of full access, no credit card. Upgrade later only if you outgrow it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)] max-w-[1120px] mx-auto">
        {TIERS.map((t) =>
          t.free ? (
            // The referred user's plan — highlighted, priced, and the only CTA.
            <article
              key={t.name}
              className="relative bg-[var(--bg)] p-8 lg:p-9 h-full shadow-[inset_0_0_0_1px_rgba(0,210,106,0.5),0_0_60px_-15px_rgba(0,210,106,0.45)]"
            >
              <span className="absolute top-6 right-6 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase bg-[var(--green-soft)] text-[var(--tappr-green)] border border-[var(--tappr-green)]/40 rounded-sm px-2 py-0.5">
                <Sparkles className="w-3 h-3" /> Your plan
              </span>

              <h3 className="text-[18px] font-semibold text-[var(--ink)]">{t.name}</h3>
              <p className="mt-2 text-[14px] text-[var(--ink-2)] leading-[1.5]">{t.blurb}</p>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-[40px] font-semibold text-[var(--tappr-green)] tracking-[-0.03em]">Free</span>
                <span className="text-[13px] text-[var(--muted)]">for 2 weeks</span>
              </div>

              <hr className="my-7 border-0 h-px bg-[var(--line)]" />

              <ul className="space-y-3 text-[14px] text-[var(--ink-2)]">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--tappr-green)] shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={onRegister}
                className="btn-lift mt-8 inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-sm bg-[var(--tappr-green)] text-black font-medium hover:brightness-110"
              >
                Register free <ArrowRight className="w-4 h-4" />
              </button>
            </article>
          ) : (
            // Paid tiers — shown for context but price hidden and de-emphasised,
            // so the free trial is the obvious choice.
            <article key={t.name} className="relative bg-[var(--bg)] p-8 lg:p-9 h-full opacity-55">
              <h3 className="text-[18px] font-semibold text-[var(--ink)]">{t.name}</h3>
              <p className="mt-2 text-[14px] text-[var(--ink-2)] leading-[1.5]">{t.blurb}</p>

              <div className="mt-6 flex items-center gap-1.5 text-[var(--muted)]">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[13px]">Available in-app</span>
              </div>

              <hr className="my-7 border-0 h-px bg-[var(--line)]" />

              <ul className="space-y-3 text-[14px] text-[var(--ink-2)]">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span aria-hidden className="font-mono text-[var(--muted)] text-[11px]">›</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          )
        )}
      </div>

      <p className="text-center mt-10 text-[13px] text-[var(--ink-2)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--tappr-green)] hover:underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
