import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

// /pricing now reuses the exact same pricing section as the landing page
// (same <Pricing /> component, cards + comparison matrix) inside the same
// `landing-root` style context — so the two are visually identical.
export default function PricingPage() {
  return (
    <div className="landing-root min-h-screen">
      <Nav />
      <Pricing />
      <Footer />
    </div>
  );
}
