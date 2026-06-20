"use client";

import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Fathom-style feature comparison matrix: plans as columns, features
// grouped into categories down the left, each cell a checkmark / value /
// dash. Growth is the highlighted (popular) column.

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  starter: Cell;
  growth: Cell;
  agency: Cell;
}

interface Group {
  category: string;
  rows: Row[];
}

const PLANS: { key: string; name: string; price: string; popular?: boolean }[] = [
  { key: "free", name: "Free", price: "€0" },
  { key: "starter", name: "Starter", price: "€97" },
  { key: "growth", name: "Growth", price: "€297", popular: true },
  { key: "agency", name: "Agency", price: "€997" },
];

const GROUPS: Group[] = [
  {
    category: "Links & Routing",
    rows: [
      { label: "Unlimited tracked links", free: true, starter: true, growth: true, agency: true },
      { label: "Smart routing conditions", free: false, starter: "Device + Geo", growth: "All conditions", agency: "All conditions" },
      { label: "Traffic rotator / split", free: false, starter: true, growth: true, agency: true },
      { label: "Link expiration + auto-redirect", free: false, starter: false, growth: true, agency: true },
      { label: "Automated A/B testing", free: false, starter: false, growth: true, agency: true },
    ],
  },
  {
    category: "QR Codes & Analytics",
    rows: [
      { label: "Dynamic QR codes", free: "3", starter: "20", growth: "Unlimited", agency: "Unlimited" },
      { label: "Click tracking + geo / device", free: true, starter: true, growth: true, agency: true },
      { label: "Analytics retention", free: "30 days", starter: "1 year", growth: "2 years", agency: "Unlimited" },
      { label: "Tracking pixels (FB, Google, TikTok)", free: false, starter: true, growth: true, agency: true },
      { label: "Competitor tracking", free: false, starter: false, growth: "3 competitors", agency: "Unlimited" },
    ],
  },
  {
    category: "AI Brain & Reports",
    rows: [
      { label: "AI Brain — chat about your stats", free: false, starter: true, growth: true, agency: true },
      { label: "Proactive AI — alerts without asking", free: false, starter: false, growth: true, agency: true },
      { label: "AI trained per brand / client", free: false, starter: false, growth: false, agency: true },
      { label: "Automated email report", free: false, starter: "Monthly", growth: "Weekly", agency: "Weekly" },
      { label: "Branded PDF reports", free: false, starter: false, growth: false, agency: true },
    ],
  },
  {
    category: "Team & White-label",
    rows: [
      { label: "Users included", free: "1", starter: "3", growth: "10", agency: "Unlimited" },
      { label: "Multi-brand workspaces", free: false, starter: false, growth: false, agency: "Up to 10" },
      { label: "Client access (own dashboard)", free: false, starter: false, growth: false, agency: true },
      { label: "White-label", free: false, starter: false, growth: "Partial", agency: "Full" },
    ],
  },
  {
    category: "Limits & Support",
    rows: [
      { label: "Clicks / month", free: "500", starter: "50,000", growth: "250,000", agency: "1,000,000" },
      { label: "Integrations", free: "Basic", starter: "IG · TikTok · WhatsApp", growth: "+ Stripe · Shopify · Calendly", agency: "Everything" },
      { label: "Support", free: "Community", starter: "Email", growth: "Priority email", agency: "Priority · 4h response" },
    ],
  },
];

function CellValue({ value, popular }: { value: Cell; popular?: boolean }) {
  if (value === true) {
    return <Check className={cn("w-4 h-4 mx-auto", popular ? "text-[#00D26A]" : "text-[#00D26A]/80")} />;
  }
  if (value === false) {
    return <Minus className="w-4 h-4 mx-auto text-neutral-700" />;
  }
  return (
    <span className={cn("text-xs font-bold", popular ? "text-white" : "text-neutral-300")}>
      {value}
    </span>
  );
}

export function PricingComparison() {
  return (
    <section className="pb-20">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Compare every plan
        </h2>
        <p className="text-sm text-neutral-500 mt-2">Everything, side by side. Pick what fits.</p>
      </div>

      <div className="max-w-5xl mx-auto overflow-x-auto scrollbar-none">
        <table className="w-full border-collapse min-w-[640px]">
          {/* Plan header */}
          <thead>
            <tr>
              <th className="text-left p-4 align-bottom w-[34%]" />
              {PLANS.map((p) => (
                <th
                  key={p.key}
                  className={cn(
                    "p-4 text-center align-bottom rounded-t-2xl",
                    p.popular && "bg-[#00D26A]/5 border-x border-t border-[#00D26A]/20"
                  )}
                >
                  {p.popular && (
                    <span className="inline-block text-[8px] font-black uppercase tracking-widest text-[#00D26A] mb-1">
                      Most Popular
                    </span>
                  )}
                  <div className={cn("text-sm font-black uppercase tracking-wide", p.popular ? "text-[#00D26A]" : "text-white")}>
                    {p.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-bold mt-0.5">{p.price}/mo</div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {GROUPS.map((group) => (
              <Fragment key={group.category}>
                {/* Category divider */}
                <tr>
                  <td
                    colSpan={5}
                    className="pt-7 pb-2 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500"
                  >
                    {group.category}
                  </td>
                </tr>
                {group.rows.map((row, i) => (
                  <tr key={group.category + i} className="border-t border-white/5">
                    <td className="py-3 px-4 text-xs font-medium text-neutral-300">{row.label}</td>
                    <td className="py-3 px-4 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CellValue value={row.starter} />
                    </td>
                    <td className={cn("py-3 px-4 text-center bg-[#00D26A]/5 border-x border-[#00D26A]/20")}>
                      <CellValue value={row.growth} popular />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <CellValue value={row.agency} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {/* Close the highlighted column with a rounded bottom */}
            <tr>
              <td />
              <td />
              <td />
              <td className="h-3 bg-[#00D26A]/5 border-x border-b border-[#00D26A]/20 rounded-b-2xl" />
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
