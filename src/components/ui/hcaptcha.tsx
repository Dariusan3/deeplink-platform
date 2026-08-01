"use client";

import { useEffect, useRef } from "react";

// hCaptcha — the image-challenge CAPTCHA ("select every image with an animal…").
// Free, privacy-friendly, and it shows real picture puzzles (unlike a plain
// checkbox). Gates the referral "Continue" so bots can't walk into signup.
//
// Keys come from env. When unset we fall back to hCaptcha's official TEST site
// key so the widget works in dev before real keys are configured. Swap in real
// keys for production (real keys are what actually show the image challenges):
//   NEXT_PUBLIC_HCAPTCHA_SITE_KEY (public) + HCAPTCHA_SECRET_KEY (server)
const TEST_SITE_KEY = "10000000-ffff-ffff-ffff-000000000001"; // hCaptcha test key
const SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || TEST_SITE_KEY;

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export function HCaptcha({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const SRC = "https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off";

    function render() {
      if (!window.hcaptcha || !containerRef.current || widgetId.current) return;
      widgetId.current = window.hcaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
      });
    }

    if (window.hcaptcha) {
      render();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>("script[data-hcaptcha]");
    if (!script) {
      script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.defer = true;
      script.dataset.hcaptcha = "1";
      document.head.appendChild(script);
    }
    const poll = setInterval(() => {
      if (window.hcaptcha) {
        clearInterval(poll);
        render();
      }
    }, 100);
    return () => clearInterval(poll);
  }, [onVerify, onExpire]);

  return <div ref={containerRef} className="flex justify-center min-h-[78px]" />;
}
