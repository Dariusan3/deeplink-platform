"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "tappr_ref_code";

/**
 * Mounted on public pages (landing, pricing). When ?ref=<code> is in the
 * URL, fires a click-track to the API and stashes the code in localStorage
 * so the eventual signup page picks it up — including via Google OAuth.
 */
export function ReferralTracker() {
  const params = useSearchParams();
  const code = params.get("ref");

  useEffect(() => {
    if (!code) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch {}
    fetch("/api/partner/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [code]);

  return null;
}
