// Timezone-aware date formatters. The user's timezone lives in
// team_settings.timezone (defaults to "UTC"). Analytics pages pull
// it via useSettings() and pass it here.
//
// We pass the timezone explicitly instead of reading it inside this
// module so the formatters work in server components / cron contexts
// (where we'd hand over the value rather than rely on a hook).

const FALLBACK_TZ = "UTC";

function safeTz(tz?: string | null): string {
  // Validate by attempting to construct a formatter. Falls back to UTC
  // if the value isn't a recognized IANA zone.
  if (!tz) return FALLBACK_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TZ;
  }
}

// "Mar 14" / "Mar 14, 2026"
export function formatDate(input: string | Date, tz?: string | null, withYear = false): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(d);
}

// "2:31 PM" — no date
export function formatTime(input: string | Date, tz?: string | null): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// "Mar 14 · 2:31 PM"
export function formatDateTime(input: string | Date, tz?: string | null): string {
  return `${formatDate(input, tz)} · ${formatTime(input, tz)}`;
}

// "0" through "23" — used by hour-bucketed peak-hours chart so it
// reflects the user's timezone, not the browser's.
export function getHourInTimezone(input: string | Date, tz?: string | null): number {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTz(tz),
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(hour, 10) % 24;
}

// "2026-03-14" — date key in the user's timezone, used to bucket clicks
// by day so the chart matches the user's calendar (a click at 11pm UTC
// in Bucharest is "tomorrow" not "today").
export function dateKeyInTimezone(input: string | Date, tz?: string | null): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTz(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const da = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${da}`;
}
