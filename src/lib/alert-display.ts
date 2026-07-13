// Display-only re-cuts of an alert row for the alerts inbox.
//
// Nothing here is persisted and no detector changes shape: the cron keeps
// writing the same title/description/metadata. This module just slices those
// three fields into the parts a one-row-per-alert list needs — a short code
// chip, a scannable subject, a summary with the raw URL taken out of it, and
// the URL itself as its own thing.
//
// The old cards printed the full 120-char destination URL inline in the body
// copy, which is what made a single alert eat half a screen. The URL belongs in
// the expanded detail, on its own line, not in the middle of a sentence.

import type { AlertType, AlertSeverity } from "@/lib/alerts";

export type AlertLike = {
  alert_type: AlertType | null;
  severity: AlertSeverity;
  title: string;
  description: string;
  affected_link: string | null;
  metadata: Record<string, unknown> | null;
};

// Shown when the metadata doesn't carry a number worth putting in the chip
// (and for the types that never had one).
const FALLBACK_CODE: Record<AlertType, string> = {
  destination_broken: "LINK",
  click_drop:         "DROP",
  click_spam:         "SPAM",
  plan_limit:         "CAP",
  ab_winner:          "WIN",
  goal_hit:           "GOAL",
  traffic_spike:      "SPIKE",
  peak_hour_shift:    "PEAK",
  country_shift:      "GEO",
  device_shift:       "DEVICE",
  stale_links:        "STALE",
  subscription_expiring: "RENEW",
};

// The leading chip on a row: "404", "-62%", "97%", "3.2×".
//
// Read straight out of the metadata the detectors write in
// src/lib/alert-detectors.ts — never parsed back out of the prose, so a copy
// edit to a title can't silently break the chip.
export function alertBadge(a: AlertLike): string {
  const type = a.alert_type;
  if (!type) return "";
  const meta = a.metadata ?? {};
  const num = (k: string) => (typeof meta[k] === "number" ? (meta[k] as number) : null);
  const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : null);

  switch (type) {
    case "destination_broken": {
      const status = num("status");
      return status ? String(status) : FALLBACK_CODE[type];
    }
    case "click_drop": {
      const pct = num("drop_pct");
      return pct != null ? `-${pct}%` : FALLBACK_CODE[type];
    }
    case "click_spam": {
      const count = num("count");
      return count != null ? `${count}×` : FALLBACK_CODE[type];
    }
    case "plan_limit": {
      const pct = num("pct");
      return pct != null ? `${pct}%` : FALLBACK_CODE[type];
    }
    case "traffic_spike": {
      const ratio = num("ratio");
      return ratio != null ? `${ratio}×` : FALLBACK_CODE[type];
    }
    case "peak_hour_shift": {
      const hour = num("new_peak");
      return hour != null ? `${hour}:00` : FALLBACK_CODE[type];
    }
    case "country_shift": {
      const country = str("new_top");
      return country ? country.toUpperCase().slice(0, 8) : FALLBACK_CODE[type];
    }
    case "stale_links": {
      const stale = num("stale_count");
      return stale != null ? String(stale) : FALLBACK_CODE[type];
    }
    case "subscription_expiring": {
      const days = num("days_left");
      return days != null ? `${days}d` : FALLBACK_CODE[type];
    }
    default:
      return FALLBACK_CODE[type];
  }
}

// Types whose title reads `… "Thing" …` where the quoted Thing is what the user
// is actually scanning the list for (a link name, a link title). Deliberately an
// allowlist, not a blanket "grab the first quoted string": ab_winner quotes the
// *test* name while its subject is the winning variant, so pulling the quotes out
// there would headline the wrong noun.
const SUBJECT_FROM_QUOTES: ReadonlySet<AlertType> = new Set<AlertType>([
  "destination_broken",
  "click_drop",
  "goal_hit",
]);

// The row's headline. Double quotes only — the titles use `'` inside words
// ("You've", "don't") and a quote class that included it would match across half
// a sentence.
const QUOTED = /"([^"]+)"/;

export function alertSubject(a: AlertLike): string {
  if (a.alert_type && SUBJECT_FROM_QUOTES.has(a.alert_type)) {
    const quoted = a.title.match(QUOTED)?.[1]?.trim();
    if (quoted) return quoted;
  }
  return a.title;
}

// The destination URL, when the alert is about one. Only destination_broken
// carries it today; the lookup is generic so a future detector gets it for free.
export function alertUrl(a: AlertLike): string | null {
  const url = a.metadata?.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

// The description with the raw URL swapped back out for a noun, because the URL
// is rendered on its own line in the expanded row. Used for both the collapsed
// one-line gist (clamped in CSS) and the full expanded body — same string, the
// row just decides how many lines of it to show.
export function alertSummary(a: AlertLike): string {
  const url = alertUrl(a);
  if (url && a.description.includes(url)) {
    return a.description.replace(url, "The destination").trim();
  }
  return a.description;
}
