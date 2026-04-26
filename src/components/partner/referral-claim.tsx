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
    fetch("/api/partner/claim-referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .catch(() => {})
      .finally(() => localStorage.removeItem(STORAGE_KEY));
  }, []);

  return null;
}
