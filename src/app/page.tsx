import { Suspense } from "react";
import { ReferralTracker } from "@/components/partner/referral-tracker";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { ProofStrip } from "@/components/landing/ProofStrip";
import { Problem } from "@/components/landing/Problem";
import { ProductBento } from "@/components/landing/ProductBento";
import { Founder } from "@/components/landing/Founder";
import { Pricing } from "@/components/landing/Pricing";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="landing-root min-h-screen">
      {/* Partner program click capture — reads ?ref=<code> from URL */}
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>

      <Nav />
      <Hero />
      <ProofStrip />
      <Problem />
      <ProductBento />
      <Founder />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}
