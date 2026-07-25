import { normalizeDestinationUrl } from "@/lib/url-normalize";
import { getHourInTimezone, getDayOfWeekInTimezone } from "@/lib/format-date";
import { routingConditionAllowed } from "@/lib/entitlements";
import type { RedirectRule } from "@/types/links";

const DEVICE_TYPES = new Set(["mobile", "tablet", "desktop"]);
const MAX_RULES = 50;

/**
 * Decide whether a visitor matches a rule's conditions. This is THE redirect
 * engine — src/app/[slug]/route.ts calls it for every click.
 *
 * It lives next to `parseRedirectRules` on purpose: the validator's whole job
 * is to reject anything this function can't read, and the two drifting apart
 * is exactly how you get a rule that saves fine and then silently never fires.
 *
 * An empty `conditions` object matches everything — that's how a catch-all
 * rule is expressed.
 *
 * `context.timezone` is the team's IANA zone (team_settings.timezone, default
 * "UTC"). It is NOT optional in spirit: hour and day-of-week used to be read
 * with now.getHours() / now.getDay(), which are the *server's* local time —
 * UTC on Vercel. A user in Bucharest setting "9 AM – 5 PM" was silently getting
 * 12:00–20:00 their time, and because a dev machine runs in the user's own zone
 * the bug was invisible locally and only appeared in production.
 */
export function evaluateConditions(
  rule: RedirectRule,
  context: { country?: string; deviceType: string; now: Date; timezone?: string | null }
): boolean {
  const { conditions } = rule;

  if (conditions.geo?.countries && conditions.geo.countries.length > 0) {
    if (!context.country || !conditions.geo.countries.includes(context.country.toUpperCase())) {
      return false;
    }
  }

  if (conditions.device?.types && conditions.device.types.length > 0) {
    if (!conditions.device.types.includes(context.deviceType as "mobile" | "tablet" | "desktop")) {
      return false;
    }
  }

  if (conditions.time) {
    const now = context.now;
    const tz = context.timezone;

    // after/before are absolute instants, so they compare correctly regardless
    // of zone — no conversion needed.
    if (conditions.time.after && now < new Date(conditions.time.after)) return false;
    if (conditions.time.before && now > new Date(conditions.time.before)) return false;

    if (conditions.time.daysOfWeek && conditions.time.daysOfWeek.length > 0) {
      if (!conditions.time.daysOfWeek.includes(getDayOfWeekInTimezone(now, tz))) return false;
    }

    const { hourStart, hourEnd } = conditions.time;
    if (hourStart !== undefined || hourEnd !== undefined) {
      // One-sided windows are meaningful and the UI lets you build them:
      // "from 9" means 09:00 until end of day, "to 17" means midnight to 17:00.
      // The engine used to apply the window ONLY when both bounds were present,
      // so a half-filled range was dropped and the rule fired 24/7.
      const start = hourStart ?? 0;
      const end = hourEnd ?? 24; // exclusive upper bound
      const hour = getHourInTimezone(now, tz);

      if (start <= end) {
        if (hour < start || hour >= end) return false;
      } else {
        // Overnight range (e.g. 22 → 6)
        if (hour < start && hour >= end) return false;
      }
    }
  }

  return true;
}

/**
 * Validate a `redirect_rules` payload against the exact shape the redirect
 * engine evaluates at request time — see `evaluateConditions` in
 * src/app/[slug]/route.ts. Anything this accepts must be something that
 * function can read, or a rule will be stored and silently never match.
 *
 * A rule with an empty `conditions` object always matches, which is how a
 * catch-all default rule is expressed.
 */
export function parseRedirectRules(
  raw: unknown,
  platformHost: string,
  plan?: string | null
): { rules: RedirectRule[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "redirect_rules must be an array" };
  if (raw.length > MAX_RULES) {
    return { error: `redirect_rules supports at most ${MAX_RULES} rules` };
  }

  const rules: RedirectRule[] = [];

  for (let i = 0; i < raw.length; i++) {
    const at = `redirect_rules[${i}]`;
    const rule = raw[i];
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      return { error: `${at} must be an object` };
    }
    const r = rule as Record<string, unknown>;

    if (typeof r.destination_url !== "string" || !r.destination_url.trim()) {
      return { error: `${at}.destination_url is required` };
    }
    const destination_url = normalizeDestinationUrl(r.destination_url);
    let host: string;
    try {
      host = new URL(destination_url).hostname;
    } catch {
      return { error: `${at}.destination_url must be a valid URL` };
    }
    if (host === platformHost) {
      return { error: `${at}.destination_url cannot point to this platform` };
    }

    if (r.priority !== undefined && !Number.isInteger(r.priority)) {
      return { error: `${at}.priority must be an integer` };
    }

    const rawConditions = r.conditions ?? {};
    if (typeof rawConditions !== "object" || rawConditions === null || Array.isArray(rawConditions)) {
      return { error: `${at}.conditions must be an object` };
    }
    const c = rawConditions as Record<string, any>;
    const conditions: RedirectRule["conditions"] = {};

    if (c.geo !== undefined) {
      if (plan !== undefined && !routingConditionAllowed(plan, "geo")) {
        return { error: `${at}.conditions.geo: smart routing is not available on your plan. Upgrade to Starter or above.` };
      }
      const countries = c.geo?.countries;
      if (!Array.isArray(countries) || countries.some((x) => typeof x !== "string")) {
        return { error: `${at}.conditions.geo.countries must be an array of ISO country codes` };
      }
      conditions.geo = { countries: countries.map((x: string) => x.toUpperCase()) };
    }

    if (c.device !== undefined) {
      if (plan !== undefined && !routingConditionAllowed(plan, "device")) {
        return { error: `${at}.conditions.device: device routing is not available on your plan. Upgrade to Starter or above.` };
      }
      const types = c.device?.types;
      if (!Array.isArray(types) || types.length === 0 || types.some((t) => !DEVICE_TYPES.has(t))) {
        return {
          error: `${at}.conditions.device.types must be a non-empty subset of mobile, tablet, desktop`,
        };
      }
      conditions.device = { types };
    }

    if (c.time !== undefined) {
      // Time & day-of-week routing is the "All conditions" tier (Growth+).
      if (plan !== undefined && !routingConditionAllowed(plan, "time")) {
        return { error: `${at}.conditions.time: time & day routing is available on Growth and above. Upgrade to unlock it.` };
      }
      const t = c.time;
      if (typeof t !== "object" || t === null || Array.isArray(t)) {
        return { error: `${at}.conditions.time must be an object` };
      }
      const time: NonNullable<RedirectRule["conditions"]["time"]> = {};

      for (const key of ["after", "before"] as const) {
        if (t[key] === undefined) continue;
        if (typeof t[key] !== "string" || Number.isNaN(Date.parse(t[key]))) {
          return { error: `${at}.conditions.time.${key} must be an ISO 8601 date string` };
        }
        time[key] = t[key];
      }

      if (t.daysOfWeek !== undefined) {
        if (
          !Array.isArray(t.daysOfWeek) ||
          t.daysOfWeek.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)
        ) {
          return { error: `${at}.conditions.time.daysOfWeek must be integers 0-6 (0 = Sunday)` };
        }
        time.daysOfWeek = t.daysOfWeek;
      }

      // Either bound may stand alone: "from 9" runs to end of day, "to 17"
      // starts at midnight. This used to demand both-or-neither, because the
      // engine silently ignored a one-sided window — the engine now handles it,
      // so the validator no longer has to reject something reasonable.
      for (const key of ["hourStart", "hourEnd"] as const) {
        if (t[key] === undefined) continue;
        if (!Number.isInteger(t[key]) || t[key] < 0 || t[key] > 23) {
          return { error: `${at}.conditions.time.${key} must be an integer between 0 and 23` };
        }
        time[key] = t[key];
      }

      conditions.time = time;
    }

    // Default the priority to declaration order; the engine sorts ascending.
    rules.push({
      priority: Number.isInteger(r.priority) ? (r.priority as number) : i,
      conditions,
      destination_url,
    });
  }

  return { rules };
}
