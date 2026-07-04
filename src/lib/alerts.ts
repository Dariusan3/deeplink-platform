// Shared constants + types for the alerts system. Detectors live in
// src/lib/alert-detectors.ts and are consumed by both the cron route and
// the manual `/api/alerts/check` endpoint.

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
export const PLAN_CLICK_CAPS: Record<string, number> = {
  free:    500,
  starter: 50_000,
  growth:  250_000,
  agency:  1_000_000,
};

export function planClickCap(plan: string | null | undefined): number {
  return PLAN_CLICK_CAPS[plan || "free"] ?? PLAN_CLICK_CAPS.free;
}

// Monday (UTC) of the week containing `dateStr` (or now), as YYYY-MM-DD.
// Used to bucket low-urgency housekeeping alerts to at most one per week.
function isoWeekStart(dateStr?: string): string {
  const base = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const dow = (base.getUTCDay() + 6) % 7; // days since Monday
  base.setUTCDate(base.getUTCDate() - dow);
  return base.toISOString().slice(0, 10);
}

// Build the dedup key for an alert. Same team + same key = same alert.
// Most time-windowed alerts include the date so we get at most one per day;
// low-urgency housekeeping (stale_links) buckets by week instead.
export function dedupKey(
  type: AlertType,
  args: { id?: string; threshold?: number; date?: string } = {}
): string {
  const today = args.date ?? new Date().toISOString().slice(0, 10);
  switch (type) {
    case "destination_broken": return `destination_broken:${args.id}`;
    case "click_drop":         return `click_drop:${today}`;
    case "click_spam":         return `click_spam:${args.id ?? "team"}:${today}`;
    case "plan_limit":         return `plan_limit:${args.threshold ?? 80}`;
    case "ab_winner":          return `ab_winner:${args.id}`;
    case "goal_hit":           return `goal_hit:${args.id}:${today}`;
    case "traffic_spike":      return `traffic_spike:${today}`;
    case "peak_hour_shift":    return `peak_hour_shift:${today}`;
    case "country_shift":      return `country_shift:${today}`;
    case "device_shift":       return `device_shift:${today}`;
    // Weekly bucket — "you have N stale links" is the same message every day,
    // so surface it at most once per week.
    case "stale_links":        return `stale_links:${isoWeekStart(args.date)}`;
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

// Display metadata. Keep in sync with the CATEGORY_STYLES map on the page.
export const ALERT_LABELS: Record<AlertType, { label: string; emoji: string; tone: AlertSeverity }> = {
  destination_broken:    { label: "Destination broken",     emoji: "🔗",  tone: "high"   },
  click_drop:            { label: "Traffic dropped",        emoji: "📉",  tone: "medium" },
  click_spam:            { label: "Suspicious clicks",      emoji: "🛡️",  tone: "high"   },
  plan_limit:            { label: "Plan limit",             emoji: "📊",  tone: "medium" },
  ab_winner:             { label: "A/B winner",             emoji: "🏆",  tone: "low"    },
  goal_hit:              { label: "Goal reached",           emoji: "🎯",  tone: "low"    },
  traffic_spike:         { label: "Traffic spike",          emoji: "🚀",  tone: "low"    },
  peak_hour_shift:       { label: "New peak hour",          emoji: "⏰",  tone: "low"    },
  country_shift:         { label: "Country shift",          emoji: "🌍",  tone: "medium" },
  device_shift:          { label: "Device shift",           emoji: "📱",  tone: "medium" },
  stale_links:           { label: "Stale links",            emoji: "🧹",  tone: "low"    },
  subscription_expiring: { label: "Subscription expiring",  emoji: "💳",  tone: "high"   },
};

export const TIER_META: Record<AlertTier, { title: string; subtitle: string; accent: string }> = {
  1: { title: "Critical",     subtitle: "You might be losing money right now", accent: "text-red-400" },
  2: { title: "Opportunities", subtitle: "You're winning — double down",        accent: "text-[#00D26A]" },
  3: { title: "Strategic",     subtitle: "Trends worth a closer look",         accent: "text-amber-400" },
  4: { title: "Operational",   subtitle: "Account-level housekeeping",         accent: "text-neutral-300" },
};
