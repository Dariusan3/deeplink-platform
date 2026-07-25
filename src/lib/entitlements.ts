// Single source of truth for what each subscription plan is entitled to.
//
// Every number and flag here must match, exactly, the public pricing page:
//   - src/components/landing/Pricing.tsx        (the four plan cards)
//   - src/components/pricing/pricing-comparison.tsx  (the full comparison matrix)
//
// If pricing copy changes, change it HERE too — enforcement reads this map, so a
// drift between this file and the matrix is a promise the product breaks.
//
// Numeric caps use `Infinity` for "Unlimited". Guard any progress bar / "N of M"
// string with `isUnlimited()` — `used / Infinity` is 0 and renders nonsense.

import type { PlanKey } from "./plans";

export type RoutingLevel = "none" | "geo_device" | "all";
export type AnomalyLevel = "basic" | "all";

// Which routing condition types a plan may use. `all` = geo · device · time · days.
export const ROUTING_CONDITIONS: Record<RoutingLevel, readonly string[]> = {
  none: [],
  geo_device: ["geo", "country", "device"],
  all: ["geo", "country", "device", "time", "hour", "days", "day", "weekday"],
};

export interface PlanEntitlements {
  // ── Numeric caps (Infinity = unlimited) ──────────────────────
  clicksPerMonth: number;
  links: number;
  teamMembers: number;
  brainChats: number; // AI Brain chats per month
  collections: number;
  qrCodes: number;
  // ── Feature flags ────────────────────────────────────────────
  routing: RoutingLevel;
  trafficRotator: boolean; // traffic rotator / split testing (A/B)
  anomalyAlerts: AnomalyLevel; // "basic" = tier-1 only, "all" = all 12 types
  weeklyReport: boolean; // AI weekly intelligence report
  emailAlerts: boolean; // email delivery of alerts
  roleBasedAccess: boolean; // owner · editor · analyst · viewer roles
  removeBranding: boolean; // hide "Powered by Tappr"
  customDomain: boolean;
  instagram: boolean; // Instagram integration
  developerApi: boolean; // Developer API + keys
}

export const ENTITLEMENTS: Record<PlanKey, PlanEntitlements> = {
  free: {
    clicksPerMonth: 500,
    links: 25,
    teamMembers: 1,
    brainChats: 10,
    collections: 5,
    qrCodes: 3,
    routing: "none",
    trafficRotator: false,
    anomalyAlerts: "basic",
    weeklyReport: false,
    emailAlerts: false,
    roleBasedAccess: false,
    removeBranding: false,
    customDomain: false,
    instagram: false,
    developerApi: false,
  },
  starter: {
    clicksPerMonth: 50_000,
    links: 500,
    teamMembers: 3,
    brainChats: Infinity,
    collections: Infinity,
    qrCodes: 25,
    routing: "geo_device",
    trafficRotator: true,
    anomalyAlerts: "all",
    weeklyReport: true,
    emailAlerts: true,
    roleBasedAccess: true,
    removeBranding: false,
    customDomain: false,
    instagram: true,
    developerApi: false,
  },
  growth: {
    clicksPerMonth: 250_000,
    links: 5_000,
    teamMembers: 10,
    brainChats: Infinity,
    collections: Infinity,
    qrCodes: 250,
    routing: "all",
    trafficRotator: true,
    anomalyAlerts: "all",
    weeklyReport: true,
    emailAlerts: true,
    roleBasedAccess: true,
    removeBranding: true,
    customDomain: true,
    instagram: true,
    developerApi: true,
  },
  agency: {
    clicksPerMonth: Infinity,
    links: Infinity,
    teamMembers: Infinity,
    brainChats: Infinity,
    collections: Infinity,
    qrCodes: Infinity,
    routing: "all",
    trafficRotator: true,
    anomalyAlerts: "all",
    weeklyReport: true,
    emailAlerts: true,
    roleBasedAccess: true,
    removeBranding: true,
    customDomain: true,
    instagram: true,
    developerApi: true,
  },
};

export function entitlements(plan: string | null | undefined): PlanEntitlements {
  return ENTITLEMENTS[(plan ?? "free") as PlanKey] ?? ENTITLEMENTS.free;
}

// Numeric cap for a single limit. Infinity = unlimited.
export function planLimit(
  plan: string | null | undefined,
  key:
    | "clicksPerMonth"
    | "links"
    | "teamMembers"
    | "brainChats"
    | "collections"
    | "qrCodes"
): number {
  return entitlements(plan)[key];
}

// Boolean feature flags only (routing/anomalyAlerts are levels — read directly).
export function hasFeature(
  plan: string | null | undefined,
  key:
    | "trafficRotator"
    | "weeklyReport"
    | "emailAlerts"
    | "roleBasedAccess"
    | "removeBranding"
    | "customDomain"
    | "instagram"
    | "developerApi"
): boolean {
  return entitlements(plan)[key];
}

export function isUnlimited(n: number): boolean {
  return !Number.isFinite(n);
}

// True when adding one more of `key` would exceed the plan's cap.
// `current` is how many the team already has.
export function wouldExceed(
  plan: string | null | undefined,
  key:
    | "links"
    | "teamMembers"
    | "brainChats"
    | "collections"
    | "qrCodes",
  current: number
): boolean {
  const cap = planLimit(plan, key);
  if (isUnlimited(cap)) return false;
  return current >= cap;
}

// Whether a given routing condition type is allowed on the plan.
export function routingConditionAllowed(
  plan: string | null | undefined,
  conditionType: string
): boolean {
  const level = entitlements(plan).routing;
  return ROUTING_CONDITIONS[level].includes(conditionType.toLowerCase());
}
