"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TikTokOverlayContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") || "";
  // Flags injected by the redirect route based on team_settings.
  // Defaults preserve existing UI when params are absent.
  const showAppTap = searchParams.get("tap") !== "0";
  const showBranding = searchParams.get("branding") !== "0";

  // When the team disabled the "Open in browser" tutorial UI, just
  // forward the visitor to the destination as soon as possible.
  useEffect(() => {
    if (!showAppTap && url) {
      window.location.replace(url);
    }
  }, [showAppTap, url]);

  // Render an empty placeholder during the auto-redirect — the user
  // shouldn't see the instructional UI flash.
  if (!showAppTap) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-pink-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-sm w-full space-y-8">
        {/* TikTok icon */}
        <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.49a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.16z"/>
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black text-white">Open in Browser</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            TikTok&apos;s in-app browser may not support all features. Open this link in your default browser for the best experience.
          </p>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-pink-400">1</span>
            </div>
            <p className="text-sm text-neutral-300">
              Tap the <span className="font-black text-white">···</span> menu in the bottom-right corner
            </p>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-pink-400">2</span>
            </div>
            <p className="text-sm text-neutral-300">
              Select <span className="font-black text-white">&quot;Open in browser&quot;</span>
            </p>
          </div>
        </div>

        {/* Direct link fallback */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-black">Or try opening directly</p>
          <a
            href={url}
            className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-sm text-center hover:opacity-90 transition-opacity"
          >
            Open Link
          </a>
          {url && (
            <p className="text-[10px] text-neutral-600 truncate">
              {url}
            </p>
          )}
        </div>

        {/* Branding — premium teams can hide via Settings → Redirect Page */}
        {showBranding && (
          <p className="text-[9px] text-neutral-700 pt-4">
            Powered by <span className="font-bold">Tappr</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function TikTokOpenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    }>
      <TikTokOverlayContent />
    </Suspense>
  );
}
