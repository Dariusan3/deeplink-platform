import { Suspense } from "react";
import { ReferralTracker } from "@/components/partner/referral-tracker";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

// /pricing now reuses the exact same pricing section as the landing page
// (same <Pricing /> component, cards + comparison matrix) inside the same
// `landing-root` style context — so the two are visually identical.
export default function PricingPage() {
  return (
    <div className="landing-root min-h-screen">
      {/* Capture ?ref=<code> here too — a partner may link straight to
          /pricing?ref=…, and the Free plan (invite-only) needs the code
          stashed before the "Get started" button is clicked. */}
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>

      <Nav />
      <Pricing />
      <Footer />
    </div>
  );
}
