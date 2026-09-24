"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useTeam } from "@/hooks/use-team";

const DISMISS_KEY = "tappr_referral_upgrade_dismissed";

/**
 * Upgrade nudge for accounts that signed up through a partner link and are
 * still on Free. Referral signups only ever see the Free plan (the funnel
 * hides paid prices), so this is where they first get pointed at billing.
 * Hidden once they pay (referral leaves 'pending') or dismiss it.
 */
export function ReferralUpgradeBanner() {
  const { activeTeam } = useTeam();
  const [referred, setReferred] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch("/api/partner/my-referral")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        let wasDismissed = false;
        try {
          wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
        } catch {}
        setDismissed(wasDismissed);
        setReferred(!!json?.pendingReferral);
      })
      .catch(() => {});
  }, []);

  const plan = activeTeam?.plan ?? "free";
  if (!referred || dismissed || plan !== "free") return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  return (
    <div className="flex items-center gap-3 border-b border-[#00D26A]/20 bg-[#00D26A]/10 px-4 py-2.5 text-sm text-white">
      <p className="flex-1">
        You&apos;re on the Free plan. Upgrade to unlock more links, clicks and features.
      </p>
      <Link
        href="/dashboard/billing"
        className="inline-flex shrink-0 items-center gap-1 font-bold text-[#00D26A] hover:underline underline-offset-4"
      >
        See plans <ArrowRight className="h-4 w-4" />
      </Link>
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 text-neutral-400 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
