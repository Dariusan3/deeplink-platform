"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The Free plan is invite-only: you can only claim a free account if you
// arrived through a partner's referral link (which stashes tappr_ref_code
// in localStorage). If there's no referral, clicking "Get started" opens
// a pop-up asking for a partner code instead of going straight to signup.
const STORAGE_KEY = "tappr_ref_code";

export function FreePlanButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const hasReferral = () => {
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  };

  const handleClick = () => {
    if (hasReferral()) {
      router.push("/signup");
    } else {
      setOpen(true);
    }
  };

  const applyCode = async () => {
    const c = code.trim();
    if (!c) {
      setError("Enter a partner code to continue.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      // Validate the code against the partner program before letting them in.
      const res = await fetch(`/api/partner/validate-code?code=${encodeURIComponent(c)}`);
      const json = await res.json();
      if (!res.ok || !json.valid) {
        setError("That code isn't valid. Check it with whoever invited you.");
        setChecking(false);
        return;
      }
      try { localStorage.setItem(STORAGE_KEY, c); } catch {}
      router.push(`/signup?ref=${encodeURIComponent(c)}`);
    } catch {
      setError("Couldn't verify the code. Try again.");
      setChecking(false);
    }
  };

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[var(--line2)] bg-[var(--panel)] p-6"
          >
            <h3 className="text-lg font-semibold text-[var(--ink)]">Free is invite-only</h3>
            <p className="text-sm text-[var(--ink-2)] mt-2 leading-relaxed">
              A free Tappr account is unlocked through a partner&apos;s invitation link.
              Paste the partner code you were given — or grab an invite from a Tappr partner.
            </p>

            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && applyCode()}
              placeholder="Partner code (e.g. 48bb43d1)"
              className="mt-4 w-full h-11 rounded-lg bg-[var(--bg)] border border-[var(--line)] px-3 text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--tappr-green)]/50"
            />
            {error && <p className="text-xs text-red-400 mt-2 font-medium">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-lg border border-[var(--line)] text-[var(--ink-2)] hover:text-[var(--ink)] text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={applyCode}
                disabled={checking}
                className="flex-1 h-11 rounded-lg bg-[var(--tappr-green)] text-black text-sm font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {checking ? "Checking…" : "Unlock free account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
