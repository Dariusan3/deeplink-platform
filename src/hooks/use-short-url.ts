"use client";

import { useEffect, useState } from "react";
import { buildShortUrl } from "@/lib/url-normalize";

// buildShortUrl() reads window.location on the client but falls back to the
// production host during SSR. That divergence causes a React hydration
// mismatch (server renders "https://tappr.me/slug", client's first render
// wants "http://localhost:3000/slug").
//
// This hook keeps the first client render identical to the server output
// (the SSR fallback) and only swaps in the real, window-derived URL after
// mount — so hydration always matches, then the value corrects itself.
export function useShortUrl(slug: string): string {
  // Initial value is computed the same way on the server and on the first
  // client render because `mounted` starts false everywhere.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? buildShortUrl(slug) : ssrShortUrl(slug);
}

// The SSR-time result of buildShortUrl — window is undefined so it uses the
// production origin. Kept in sync with getDisplayOrigin()'s fallback.
function ssrShortUrl(slug: string): string {
  return `https://tappr.me/${slug}`;
}
