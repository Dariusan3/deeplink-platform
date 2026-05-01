// Normalizes destination URLs for consistency:
// 1. Trims surrounding whitespace
// 2. Forces https:// — if no protocol, prepend; if http://, upgrade
// 3. Strips a leading "www." from the hostname (only — subdomains like
//    "app.example.com" are kept intact)
//
// Used by every link-creation entry point (client + API + DB trigger)
// so the destination_url stored in the DB is always canonical.
//
// Caveat: a small number of sites only respond to the www subdomain. If
// stripping breaks a link, the user can re-enter the URL — the trigger
// won't strip a non-"www" subdomain, only the literal "www".

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

  // 3. Strip leading "www." right after the scheme. Only the literal "www" —
  //    "app.", "shop.", etc. are preserved.
  value = value.replace(/^https:\/\/www\./i, "https://");

  return value;
}

// Returns the current host stripped of any leading "www." — used everywhere
// we display a short URL (`tappr.me/slug` not `www.tappr.me/slug`). Falls
// back to "tappr.me" during SSR.
export function getDisplayHost(): string {
  if (typeof window === "undefined") return "tappr.me";
  return window.location.host.replace(/^www\./i, "");
}

// Same idea for full origin — used by export-dialog, partner referral URL,
// developer API base URL display.
export function getDisplayOrigin(): string {
  if (typeof window === "undefined") return "https://tappr.me";
  const proto = window.location.protocol; // keeps http on localhost dev
  return `${proto}//${getDisplayHost()}`;
}

// Convenience: build the FULL short URL for a given slug — with `https://`
// prefix and no `www.`. Same string in display + clipboard so when the
// user copies, they get a complete shareable URL.
export function buildShortUrl(slug: string): string {
  return `${getDisplayOrigin()}/${slug}`;
}
