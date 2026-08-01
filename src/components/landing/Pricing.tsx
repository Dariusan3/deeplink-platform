import { Star } from "lucide-react";
import { Reveal } from "./Reveal";
import { PricingComparison } from "@/components/pricing/pricing-comparison";
import { FreePlanButton } from "@/components/pricing/free-plan-button";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import type { TapprPlan } from "@/lib/fanbasis";

type Tier = {
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: string;
  plan: TapprPlan | null; // null = the free plan (no checkout)
  accent: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "€0",
    cadence: "forever",
    blurb: "For testing the routing engine and personal links.",
    features: [
      "500 clicks / month · 5 links",
      "Automatic deep linking (100+ apps)",
      "AI Brain — 10 chats / mo",
      "Real-time analytics",
    ],
    cta: "Get started",
    plan: null,
    accent: false,
  },
  {
    name: "Starter",
    price: "€97",
    cadence: "/month",
    blurb: "For solo entrepreneurs who want to start smart.",
    features: [
      "50,000 clicks / month · 500 links",
      "Smart routing — geo + device",
      "Traffic rotator + click goals",
      "Unlimited AI Brain + all alerts",
    ],
    cta: "Try Starter",
    plan: "starter",
    accent: false,
  },
  {
    name: "Growth",
    price: "€297",
    cadence: "/month",
    blurb: "For businesses that scale and want full control.",
    features: [
      "250,000 clicks / month · 5,000 links",
      "Advanced routing (geo·device·time·days)",
      "Remove Tappr branding",
      "Developer API + keys",
    ],
    cta: "Try Growth",
    plan: "growth",
    accent: true,
  },
  {
    name: "Agency",
    price: "€997",
    cadence: "/month",
    blurb: "For agencies running client campaigns at volume.",
    features: [
      "Unlimited clicks · links · team members",
      "Everything in Growth, unmetered",
      "Unlimited collections",
      "Priority support — 4h response",
    ],
    cta: "Try Agency",
    plan: "agency",
    accent: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-b border-[var(--line)] py-24 lg:py-32">
      <div className="max-w-[1280px] mx-auto px-6">
        <Reveal>
          <span className="ulabel">Pricing</span>
        </Reveal>
        <Reveal delay={60}>
          <h2
            className="mt-5 font-semibold text-[var(--ink)] tracking-[-0.04em] max-w-[820px]"
            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.98 }}
          >
            Start free.{" "}
            <span className="text-[var(--ink-2)] font-light">Upgrade when you outgrow it.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] border border-[var(--line)]">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 60}>
              <article
                className={`relative bg-[var(--bg)] p-8 lg:p-10 h-full ${
                  t.accent ? "shadow-[inset_0_0_0_1px_rgba(0,210,106,0.4),0_0_60px_-15px_rgba(0,210,106,0.4)]" : ""
                }`}
              >
                {t.accent && (
                  <span className="absolute top-6 right-6 inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase bg-[var(--green-soft)] text-[var(--tappr-green)] border border-[var(--tappr-green)]/40 rounded-sm px-2 py-0.5">
                    <Star className="w-3 h-3 fill-current" /> Most Popular
                  </span>
                )}
                <h3 className="text-[18px] font-semibold text-[var(--ink)]">{t.name}</h3>
                <p className="mt-2 text-[14px] text-[var(--ink-2)] leading-[1.5]">{t.blurb}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-[44px] font-semibold text-[var(--ink)] tracking-[-0.03em]">{t.price}</span>
                  <span className="text-[14px] text-[var(--muted)]">{t.cadence}</span>
                </div>

                <hr className="my-7 border-0 h-px bg-[var(--line)]" />

                <ul className="space-y-3 text-[14px] text-[var(--ink-2)]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span aria-hidden className="font-mono text-[var(--muted)] text-[11px]">›</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.plan === null ? (
                  <FreePlanButton
                    className="mt-8 inline-flex items-center justify-center w-full px-4 py-3 rounded-sm btn-lift cursor-pointer border border-[var(--line)] hover:border-[var(--line-2)] text-[var(--ink-2)] hover:text-[var(--ink)]"
                  >
                    {t.cta}
                  </FreePlanButton>
                ) : (
                  <UpgradeButton
                    plan={t.plan}
                    variant="ghost"
                    className={`mt-8 inline-flex items-center justify-center w-full h-auto px-4 py-3 rounded-sm btn-lift cursor-pointer ${
                      t.accent
                        ? "bg-[var(--tappr-green)] text-black font-medium hover:bg-[var(--tappr-green)] hover:brightness-110"
                        : "border border-[var(--line)] hover:border-[var(--line-2)] text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-transparent"
                    }`}
                  >
                    {t.cta}
                  </UpgradeButton>
                )}
              </article>
            </Reveal>
          ))}
        </div>

        {/* Full feature comparison — same matrix as /pricing */}
        <Reveal delay={240}>
          <div className="mt-20">
            <PricingComparison />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
