// Normalizes destination URLs for consistency:
// 1. Trims surrounding whitespace
// 2. Forces https:// — if no protocol, prepend; if http://, upgrade
//
// The hostname (including any leading "www.") is preserved as-is, because
// some destinations only respond on the www subdomain.
//
// Used by every link-creation entry point (client + API + DB trigger)
// so the destination_url stored in the DB is always canonical.

export function normalizeDestinationUrl(input: string | null | undefined): string {
  if (!input) return "";
  let value = String(input).trim();
  if (!value) return "";

  // 1. Force protocol — no scheme means we assume https.
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }
  // 2. Upgrade http:// → https://
  value = value.replace(/^http:\/\//i, "https://");

  return value;
}

// Returns the current host stripped of any leading "www." — used everywhere
// we display a short URL (`tappr.me/slug` not `www.tappr.me/slug`). Falls
// back to "tappr.me" during SSR.
// Derived from NEXT_PUBLIC_APP_URL, which is inlined at build time and is
// therefore IDENTICAL on the server and the client — so these never trigger a
// hydration mismatch. The old version read `window.location` on the client but
// returned "tappr.me" on the server, which threw a hydration error on the link
// editor ("Will be available at …"). Falls back to the production host if the
// env var is missing or malformed.
function appUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://tappr.me";
  try {
    return new URL(raw);
  } catch {
    return new URL("https://tappr.me");
  }
}

export function getDisplayHost(): string {
  return appUrl().host.replace(/^www\./i, "");
}

// Same idea for full origin — used by export-dialog, partner referral URL,
// developer API base URL display.
export function getDisplayOrigin(): string {
  const u = appUrl();
  return `${u.protocol}//${u.host.replace(/^www\./i, "")}`;
}

// Convenience: build the FULL short URL for a given slug — with `https://`
// prefix and no `www.`. Same string in display + clipboard so when the
// user copies, they get a complete shareable URL.
export function buildShortUrl(slug: string): string {
  return `${getDisplayOrigin()}/${slug}`;
}

// Sanitize a custom path on input — runs in the onChange handler so the
// user can never end up with an invalid character in the field.
// Rules:
//   - Trim leading/trailing whitespace
//   - Replace any inner whitespace run with a single `-`
//   - Drop anything that isn't [A-Za-z0-9 _ -]
//   - Collapse runs of `-` into a single `-`
// We keep case as-is (URLs are case-sensitive — don't surprise the user).
export function sanitizePath(input: string): string {
  if (!input) return "";
  return input
    .replace(/^\s+/, "")              // leading whitespace
    .replace(/\s+/g, "-")             // inner whitespace → dash
    .replace(/[^A-Za-z0-9_-]/g, "")   // strip everything else
    .replace(/-{2,}/g, "-");          // collapse double-dashes
}
