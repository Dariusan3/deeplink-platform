// Shared constants + types for the alerts system. Detectors live in
// src/lib/alert-detectors.ts and are consumed by both the cron route and
// the manual `/api/alerts/check` endpoint.

import { entitlements } from "./entitlements";

export type AlertType =
  // ── Tier 1 — "I'm losing money right now" ───────────────────
  | "destination_broken"
  | "click_drop"
  | "click_spam"
  | "plan_limit"
  // ── Tier 2 — "I'm winning, optimise" ────────────────────────
  | "ab_winner"
  | "goal_hit"
  | "traffic_spike"
  | "peak_hour_shift"
  // ── Tier 3 — Strategic ──────────────────────────────────────
  | "country_shift"
  | "device_shift"
  | "stale_links"
  // ── Tier 4 — Operational ───────────────────────────────────
  | "subscription_expiring";

export type AlertSeverity = "low" | "medium" | "high";
export type AlertTier = 1 | 2 | 3 | 4;

// Monthly click caps per plan — matches the public /pricing page.
//
// Agency is Infinity, not a number: /pricing and the comparison table both sell
// it as "Unlimited clicks". It used to be capped at 1,000,000, which meant an
// Agency customer paying €997 could be told they'd hit their limit and should
// "consider upgrading" — to a plan that doesn't exist. Callers must therefore
// handle a non-finite cap (see `hasClickCap`).
export const PLAN_CLICK_CAPS: Record<string, number> = {
  free:    entitlements("free").clicksPerMonth,
  starter: entitlements("starter").clicksPerMonth,
  growth:  entitlements("growth").clicksPerMonth,
  agency:  entitlements("agency").clicksPerMonth,
};

export function planClickCap(plan: string | null | undefined): number {
  return entitlements(plan).clicksPerMonth;
}

// True when the plan actually has a ceiling worth measuring against. Guard any
// percentage, progress bar or "N of M" string with this — `used / Infinity` is
// 0 and `Infinity.toLocaleString()` renders as "∞", neither of which is what
// you want to show a paying customer.
export function hasClickCap(plan: string | null | undefined): boolean {
  return Number.isFinite(planClickCap(plan));
}

// Monday (UTC) of the week containing `dateStr` (or now), as YYYY-MM-DD.
// Used to bucket low-urgency housekeeping alerts to at most one per week.
function isoWeekStart(dateStr?: string): string {
  const base = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const dow = (base.getUTCDay() + 6) % 7; // days since Monday
  base.setUTCDate(base.getUTCDate() - dow);
  return base.toISOString().slice(0, 10);
}

// Build the dedup key for an alert. Same team + same key = same alert, and
// `persistDetections` refuses to insert a key that's already open or fired
// inside the cooldown window.
//
// The key's TIME BUCKET is therefore the alert's re-fire cadence, and picking it
// is the single biggest lever on how noisy the list gets. The rule: bucket by
// the window the alert is actually *about*.
//
//   * A condition that persists for weeks (a shifted top country, a pile of
//     stale links) must not re-announce itself every single day.
//   * A goal is hit once per goal period, not once per day — a monthly goal
//     crossed on the 5th used to re-fire on the 6th, the 7th, and every day to
//     the 30th, because the bucket was the date instead of the period.
//   * Anything scoped to one link must carry that link's id, or the second
//     link to trip the same detector on the same day gets silently swallowed as
//     a duplicate of the first.
export function dedupKey(
  type: AlertType,
  args: { id?: string; threshold?: number; date?: string; period?: string } = {}
): string {
  const today = args.date ?? new Date().toISOString().slice(0, 10);
  const week  = isoWeekStart(args.date);
  const month = today.slice(0, 7);
  switch (type) {
    case "destination_broken": return `destination_broken:${args.id}`;
    // Per link, weekly. This key used to be just `click_drop:${today}` while the
    // detector passed a link id it never used — so on a day when three links
    // dropped, two of them were dropped on the floor as duplicates. Weekly (not
    // daily) because a link that stays down would otherwise file a fresh alert
    // every morning until you fixed it.
    case "click_drop":         return `click_drop:${args.id}:${week}`;
    case "click_spam":         return `click_spam:${args.id ?? "team"}:${today}`;
    // Month bucket: crossing 80% again next cycle is genuinely new news; crossing
    // it again tomorrow is not.
    case "plan_limit":         return `plan_limit:${args.threshold ?? 80}:${month}`;
    case "ab_winner":          return `ab_winner:${args.id}`;
    // Bucket by the goal's OWN period, so a weekly goal reports once a week and a
    // monthly goal once a month.
    case "goal_hit": {
      const bucket = args.period === "monthly" ? month : args.period === "weekly" ? week : today;
      return `goal_hit:${args.id}:${bucket}`;
    }
    case "traffic_spike":      return `traffic_spike:${today}`;
    // The remaining four all describe slow-moving conditions measured over a
    // 7-day-vs-30-day window. That window barely moves between two consecutive
    // days, so a daily bucket meant the same trend was re-announced ~7 times
    // before it changed. Weekly.
    case "peak_hour_shift":    return `peak_hour_shift:${week}`;
    case "country_shift":      return `country_shift:${week}`;
    case "device_shift":       return `device_shift:${week}`;
    case "stale_links":        return `stale_links:${week}`;
    case "subscription_expiring": return `subscription_expiring:${args.id}`;
  }
}

// Tier classification — drives both the visual section in the UI and the
// urgency of email notifications.
export const ALERT_TIERS: Record<AlertType, AlertTier> = {
  destination_broken: 1,
  click_drop:         1,
  click_spam:         1,
  plan_limit:         1,
  ab_winner:          2,
  goal_hit:           2,
  traffic_spike:      2,
  peak_hour_shift:    2,
  country_shift:      3,
  device_shift:       3,
  stale_links:        3,
  subscription_expiring: 4,
};

// Display metadata. Icons live in src/lib/alert-icons.ts (lucide SVGs).
// Keep in sync with the CATEGORY_STYLES map on the page.
export const ALERT_LABELS: Record<AlertType, { label: string; tone: AlertSeverity }> = {
  destination_broken:    { label: "Destination broken",     tone: "high"   },
  click_drop:            { label: "Traffic dropped",        tone: "medium" },
  click_spam:            { label: "Suspicious clicks",      tone: "high"   },
  plan_limit:            { label: "Plan limit",             tone: "medium" },
  ab_winner:             { label: "A/B winner",             tone: "low"    },
  goal_hit:              { label: "Goal reached",           tone: "low"    },
  traffic_spike:         { label: "Traffic spike",          tone: "low"    },
  peak_hour_shift:       { label: "New peak hour",          tone: "low"    },
  country_shift:         { label: "Country shift",          tone: "medium" },
  device_shift:          { label: "Device shift",           tone: "medium" },
  stale_links:           { label: "Stale links",            tone: "low"    },
  subscription_expiring: { label: "Subscription expiring",  tone: "high"   },
};

export const TIER_META: Record<AlertTier, { title: string; subtitle: string; accent: string }> = {
  1: { title: "Critical",     subtitle: "You might be losing money right now", accent: "text-red-400" },
  2: { title: "Opportunities", subtitle: "You're winning, double down",         accent: "text-[#00D26A]" },
  3: { title: "Strategic",     subtitle: "Trends worth a closer look",         accent: "text-amber-400" },
  4: { title: "Operational",   subtitle: "Account-level housekeeping",         accent: "text-neutral-300" },
};
