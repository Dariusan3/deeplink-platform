"use client";

import { useEffect } from "react";

const STORAGE_KEY = "tappr_ref_code";

/**
 * Mounted in the dashboard shell. On first authenticated load, if a referral
 * code is sitting in localStorage (placed there by the signup page during
 * Google OAuth flow), POST it to /api/partner/claim-referral to credit the
 * partner — then clear the key so we don't claim twice.
 */
export function ReferralClaim() {
  useEffect(() => {
    const code = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!code) return;
    // Clear the key only on a definitive answer from the server. It used to be
    // cleared in `finally`, which threw the code away on a network blip or a
    // 401 from a session that was still settling — and a referral discarded
    // that way is gone for good, because nothing else remembers it.
    fetch("/api/partner/claim-referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (res.ok) localStorage.removeItem(STORAGE_KEY);
      })
      .catch(() => {});
  }, []);

  return null;
}
