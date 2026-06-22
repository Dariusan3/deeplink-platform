// Tiny localStorage stale-while-revalidate helpers shared by the data hooks.
// The pattern everywhere: deterministic empty `useState` init (so SSR + the
// first client render match — no hydration mismatch), hydrate from the cache
// in a `useEffect` after mount, then write the cache after each fetch and
// skip the loading skeleton whenever a cached value exists.
//
// Keys are namespaced per "thing" + a caller-supplied suffix (usually the
// team id, sometimes team id + filter params for views like analytics).

export function readSwrCache<T>(prefix: string, suffix: string): T | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(prefix + suffix) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSwrCache<T>(prefix: string, suffix: string, value: T): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(prefix + suffix, JSON.stringify(value));
    }
  } catch {
    // Quota exceeded / serialization error — caching is best-effort.
  }
}
