"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, Gift, Building2, Link2, Image, BarChart3, Shuffle, QrCode, Globe, Smartphone, Languages, CalendarOff, Shield, Tag, ShoppingCart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { PricingComparison } from "@/components/pricing/pricing-comparison";

type PlanKey = "starter" | "growth" | "agency";

type BillingPeriod = "monthly" | "yearly";

const plans = [
  {
    name: "STARTER",
    description: "For solo entrepreneurs who want to start smart.",
    monthlyPrice: 97,
    yearlyPrice: 78,
    popular: false,
    cta: "Start with Starter",
    features: [
      { text: "Unlimited links with full tracking", bold: true },
      "Smart routing — 2 conditions per link (device, location)",
      "Dynamic QR codes — up to 20",
      "AI Brain — chat about your stats",
      "Automated monthly report via email",
      "3 users included",
      "50,000 clicks / month",
      "Instagram, TikTok, WhatsApp integrations",
    ],
  },
  {
    name: "GROWTH",
    description: "For businesses that scale and want full control.",
    monthlyPrice: 297,
    yearlyPrice: 237,
    popular: true,
    cta: "Choose Growth",
    features: [
      { text: "Everything in Starter, plus:", bold: true },
      { text: "Advanced smart routing — device + location + time + source combined", bold: true },
      { text: "Automated A/B testing on links and QR codes", hot: true },
      { text: "Proactive AI Brain — alerts you without asking", bold: true },
      "Weekly reports instead of monthly",
      "Links with expiration and auto-redirect",
      "10 users included",
      "250,000 clicks / month",
      "Partial white-label + Stripe, Shopify, Calendly",
      { text: "Competitor tracking — monitor 3 competitors", bold: true },
    ],
  },
  {
    name: "AGENCY",
    description: "For agencies and entrepreneurs with multiple brands or clients.",
    monthlyPrice: 997,
    yearlyPrice: 797,
    popular: false,
    cta: "Choose Agency",
    features: [
      { text: "Everything in Growth, plus:", bold: true },
      { text: "Multi-brand — up to 10 separate brands in one account", bold: true },
      { text: "Client access — clients only see their own dashboard", bold: true },
      { text: "Full white-label — platform appears with your brand", hot: true },
      { text: "Branded PDF reports auto-generated for clients", bold: true },
      { text: "AI Brain trained per brand/client", bold: true },
      "Unlimited users",
      "1,000,000 clicks / month",
      "Unlimited competitor tracking",
      "Priority support — response within 4 hours",
    ],
  },
];

const allFeatures = [
  { icon: <Link2 className="w-5 h-5" />, label: "Automatic Deep Linking (100+ apps)" },
  { icon: <Image className="w-5 h-5" />, label: "Custom Link Previews" },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Tracking Pixels (FB, Google, TikTok)" },
  { icon: <Shuffle className="w-5 h-5" />, label: "A/B Testing & Traffic Rotator" },
  { icon: <QrCode className="w-5 h-5" />, label: "QR Code Generator" },
  { icon: <Globe className="w-5 h-5" />, label: "Geo Targeting" },
  { icon: <Smartphone className="w-5 h-5" />, label: "Device Targeting" },
  { icon: <Languages className="w-5 h-5" />, label: "Language Targeting" },
  { icon: <CalendarOff className="w-5 h-5" />, label: "Link Expiration" },
  { icon: <Shield className="w-5 h-5" />, label: "Click Limitation" },
  { icon: <Tag className="w-5 h-5" />, label: "UTM Parameters" },
  { icon: <ShoppingCart className="w-5 h-5" />, label: "Amazon Auto Affiliate Tag" },
];

const faqs = [
  {
    q: "Can I upgrade or downgrade later?",
    a: "Yes! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged a prorated amount. When downgrading, the change takes effect at the end of your current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for enterprise plans.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team for a full refund.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. You can cancel your subscription at any time from your account settings. Your plan will remain active until the end of your current billing period.",
  },
  {
    q: "What happens to my links if I cancel?",
    a: "Your links will continue to work on the free plan (500 clicks/month). If you exceed the free tier limit, links will be paused until the next month or until you upgrade.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      onClick={() => setOpen(!open)}
      className={cn(
        "w-full text-left p-5 rounded-2xl border transition-all duration-300",
        open
          ? "bg-[#00D26A]/5 border-[#00D26A]/20"
          : "bg-white/[0.01] border-white/5 hover:border-white/10"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white">{question}</span>
        <div
          className={cn(
            "shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
            open
              ? "bg-[#00D26A]/20 text-[#00D26A] rotate-45"
              : "bg-white/5 text-neutral-400"
          )}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>
      {open && (
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed pr-10">{answer}</p>
      )}
    </button>
  );
}

type FeatureItem = string | { text: string; bold?: boolean; hot?: boolean };

function FeatureList({ features }: { features: FeatureItem[] }) {
  return (
    <ul className="space-y-3">
      {features.map((f, i) => {
        const text = typeof f === "string" ? f : f.text;
        const isBold = typeof f !== "string" && f.bold;
        const isHot = typeof f !== "string" && f.hot;
        return (
          <li key={i} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00D26A] mt-2 shrink-0" />
            <span className={cn("text-sm leading-relaxed", isBold ? "font-bold text-white" : "text-neutral-400")}>
              {text}
              {isHot && (
                <span className="inline-flex items-center ml-2 text-[10px] font-black bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                  <Flame className="w-3 h-3 mr-0.5" /> top
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[80vh] opacity-50"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(0,210,106,0.15) 0%, #000 70%)",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,210,106,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,210,106,0.02)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D26A] to-[#00FF87] flex items-center justify-center shadow-[0_0_20px_rgba(0,210,106,0.3)] transition-transform group-hover:scale-110">
              <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Tappr</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              variant="outline"
              className="btn-secondary-glass text-sm font-bold px-5"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-4">
            <span className="text-[#00D26A] italic">Pricing</span>
          </h1>
          <p className="text-lg text-neutral-400 font-medium mb-10">
            No hidden fees. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white/[0.03] border border-white/5 rounded-full p-1 relative">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
                billing === "monthly"
                  ? "bg-white/10 text-white shadow-lg"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative",
                billing === "yearly"
                  ? "bg-[#00D26A] text-black shadow-[0_0_20px_rgba(0,210,106,0.3)]"
                  : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              Yearly
              <span className="absolute -top-2 -right-3 text-[9px] font-black bg-[#39FF14] text-black px-1.5 py-0.5 rounded-full">
                -25%
              </span>
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {plans.map((plan) => {
              const price = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div
                  key={plan.name}
                  className={cn(
                    "relative rounded-2xl border p-8 transition-all duration-500",
                    plan.popular
                      ? "border-[#00D26A]/40 bg-[#00D26A]/5 shadow-[0_0_40px_rgba(0,210,106,0.08)] md:scale-[1.03]"
                      : "border-white/5 bg-white/[0.01] hover:border-white/10"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#00D26A] text-black text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-[0_0_15px_rgba(0,210,106,0.4)]">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">{plan.name}</h3>
                    <div className="mb-2">
                      <span className="text-xs text-neutral-500 align-top">€</span>
                      <span className={cn("text-5xl font-black", plan.popular ? "text-[#00D26A]" : "text-white")}>
                        {price}
                      </span>
                      <span className="text-neutral-500 font-bold text-sm"> / month</span>
                    </div>
                    <p className="text-sm text-neutral-500 font-medium leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    <FeatureList features={plan.features} />
                  </div>

                  <UpgradeButton
                    plan={plan.name.toLowerCase() as PlanKey}
                    className={cn(
                      "w-full h-12 rounded-xl font-black text-xs tracking-widest",
                      plan.popular
                        ? "btn-primary-pulse text-black"
                        : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
                    )}
                  >
                    {plan.cta} &nbsp;&rarr;
                  </UpgradeButton>
                </div>
              );
            })}
          </div>
        </section>

        {/* Free + Enterprise Row */}
        <section className="pb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-[#00D26A]/10 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-[#00D26A]" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-white">Free Plan</h4>
                <p className="text-xs text-neutral-500 font-medium">
                  500 clicks/month &bull; all features &bull; 30 days analytics
                </p>
              </div>
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                variant="outline"
                className="shrink-0 h-10 rounded-xl border-[#00D26A]/30 text-[#00D26A] text-xs font-black uppercase tracking-widest hover:bg-[#00D26A]/10"
              >
                Start Free
              </Button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-white">Enterprise</h4>
                <p className="text-xs text-neutral-500 font-medium">
                  Higher limits, custom infrastructure, dedicated support
                </p>
              </div>
              <Button
                variant="outline"
                className="shrink-0 h-10 rounded-xl border-white/10 text-white text-xs font-black uppercase tracking-widest hover:bg-white/5"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </section>

        {/* Feature comparison matrix */}
        <PricingComparison />

        {/* All Features */}
        <section className="pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              All Features Included on Every Plan
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {allFeatures.map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:border-[#00D26A]/20 hover:bg-[#00D26A]/5 transition-all group"
              >
                <span className="text-neutral-500 group-hover:text-[#00D26A] transition-colors shrink-0">
                  {feature.icon}
                </span>
                <span className="text-sm font-bold text-neutral-300 group-hover:text-white transition-colors">
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-neutral-500 font-medium">
              Everything you need to know about our plans and service
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-neutral-500 font-medium">
              Still have questions?{" "}
              <Link href="#" className="text-[#00D26A] font-bold hover:text-[#39FF14] transition-colors">
                Contact our support team
              </Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D26A] to-[#00FF87] flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </div>
                <span className="font-black text-lg text-white">Tappr</span>
              </div>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                Smart link management for modern businesses.
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Solutions</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">YouTube Links</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Amazon Affiliates</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Music & Podcasts</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Instagram Links</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Features</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">A/B Testing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Smart Routing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">AI Brain</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">QR Code Generator</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Resources</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00D26A] mb-4 border-b border-[#00D26A]/20 pb-2 inline-block">Legal</h5>
              <ul className="space-y-2 text-sm text-neutral-500 font-medium">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600 font-medium">
            <span>&copy; 2026 Tappr. All rights reserved.</span>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms and conditions</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
