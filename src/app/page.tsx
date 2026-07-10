import { Suspense } from "react";
import { ReferralTracker } from "@/components/partner/referral-tracker";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { ProofStrip } from "@/components/landing/ProofStrip";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ProductBento } from "@/components/landing/ProductBento";
import { Founder } from "@/components/landing/Founder";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { JsonLd } from "@/components/seo/json-ld";
import {
  organizationSchema,
  webSiteSchema,
  softwareApplicationSchema,
  faqSchema,
} from "@/lib/seo";

export default function HomePage() {
  return (
    <div className="landing-root min-h-screen">
      {/* Structured data — Organization + WebSite establish the brand entity;
          SoftwareApplication describes the product; FAQPage mirrors <Faq />. */}
      <JsonLd
        data={[
          organizationSchema(),
          webSiteSchema(),
          softwareApplicationSchema(),
          faqSchema(),
        ]}
      />

      {/* Partner program click capture — reads ?ref=<code> from URL */}
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>

      <Nav />
      <Hero />
      <ProofStrip />
      <Problem />
      <HowItWorks />
      <ProductBento />
      <Founder />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
