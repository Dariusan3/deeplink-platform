import { Suspense } from "react";
import type { Metadata } from "next";
import { ReferralTracker } from "@/components/partner/referral-tracker";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE, softwareApplicationSchema } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing — Free for 500 clicks/month",
  description:
    "Tappr pricing. Start free with 500 clicks per month, no credit card required. Paid plans add higher click volume, team seats, and API access.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${SITE.name}`,
    description:
      "Start free with 500 clicks per month, no credit card. Paid plans add volume, team seats, and API access.",
    url: `${SITE.url}/pricing`,
  },
};

// /pricing now reuses the exact same pricing section as the landing page
// (same <Pricing /> component, cards + comparison matrix) inside the same
// `landing-root` style context — so the two are visually identical.
export default function PricingPage() {
  return (
    <div className="landing-root min-h-screen">
      <JsonLd data={softwareApplicationSchema()} />

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
