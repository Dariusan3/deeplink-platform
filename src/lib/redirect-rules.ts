import { normalizeDestinationUrl } from "@/lib/url-normalize";
import type { RedirectRule } from "@/types/links";

const DEVICE_TYPES = new Set(["mobile", "tablet", "desktop"]);
const MAX_RULES = 50;

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
  platformHost: string
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
      const countries = c.geo?.countries;
      if (!Array.isArray(countries) || countries.some((x) => typeof x !== "string")) {
        return { error: `${at}.conditions.geo.countries must be an array of ISO country codes` };
      }
      conditions.geo = { countries: countries.map((x: string) => x.toUpperCase()) };
    }

    if (c.device !== undefined) {
      const types = c.device?.types;
      if (!Array.isArray(types) || types.length === 0 || types.some((t) => !DEVICE_TYPES.has(t))) {
        return {
          error: `${at}.conditions.device.types must be a non-empty subset of mobile, tablet, desktop`,
        };
      }
      conditions.device = { types };
    }

    if (c.time !== undefined) {
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

      // The engine only applies an hour window when BOTH bounds are present.
      const hasStart = t.hourStart !== undefined;
      const hasEnd = t.hourEnd !== undefined;
      if (hasStart !== hasEnd) {
        return { error: `${at}.conditions.time requires both hourStart and hourEnd, or neither` };
      }
      if (hasStart) {
        for (const key of ["hourStart", "hourEnd"] as const) {
          if (!Number.isInteger(t[key]) || t[key] < 0 || t[key] > 23) {
            return { error: `${at}.conditions.time.${key} must be an integer between 0 and 23` };
          }
          time[key] = t[key];
        }
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
