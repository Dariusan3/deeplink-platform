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
    category: "Core",
    rows: [
      { label: "Automatic deep linking — opens the native app on mobile (100+ apps)", free: true, starter: true, growth: true, agency: true },
      { label: "Clicks / month", free: "500", starter: "50,000", growth: "250,000", agency: "Unlimited" },
      { label: "Links included", free: "5", starter: "500", growth: "5,000", agency: "Unlimited" },
      { label: "Team members", free: "1", starter: "3", growth: "10", agency: "Unlimited" },
    ],
  },
  {
    category: "Smart Routing & Links",
    rows: [
      { label: "Smart routing conditions", free: false, starter: "Geo + Device", growth: "All (geo·device·time·days)", agency: "All (geo·device·time·days)" },
      { label: "Traffic rotator / split testing", free: false, starter: true, growth: true, agency: true },
      { label: "Click goals + tracking per link", free: true, starter: true, growth: true, agency: true },
    ],
  },
  {
    category: "AI & Real-Time Intelligence",
    rows: [
      { label: "AI Brain — chat about your stats", free: "10 chats / mo", starter: "Unlimited", growth: "Unlimited", agency: "Unlimited" },
      { label: "Proactive anomaly alerts (broken links, traffic drops, click fraud)", free: "Basic", starter: "All 12 types", growth: "All 12 types", agency: "All 12 types" },
      { label: "AI weekly intelligence report", free: false, starter: true, growth: true, agency: true },
      { label: "Email alerts", free: false, starter: true, growth: true, agency: true },
    ],
  },
  {
    category: "Analytics",
    rows: [
      { label: "Real-time analytics (geo · device · referrer)", free: true, starter: true, growth: true, agency: true },
      { label: "Per-link analytics", free: true, starter: true, growth: true, agency: true },
    ],
  },
  {
    category: "Team & Organization",
    rows: [
      { label: "Role-based access (owner · editor · analyst · viewer)", free: false, starter: true, growth: true, agency: true },
      { label: "Collections (folders · tree · canvas view)", free: "5", starter: "Unlimited", growth: "Unlimited", agency: "Unlimited" },
    ],
  },
  {
    category: "Branding, Developer & Support",
    rows: [
      { label: "Remove Tappr branding", free: false, starter: false, growth: true, agency: true },
      { label: "Developer API + keys", free: false, starter: false, growth: true, agency: true },
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
