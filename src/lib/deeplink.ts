// Maps a normal web URL to a native-app deep link so that, on a phone,
// the link opens the app (YouTube, Instagram, etc.) instead of the
// mobile browser. Returns null when there's no known app for the host —
// the caller then just does a normal web redirect.
//
// Two values come back:
//   ios     — the URI the iOS app registers (custom scheme or universal)
//   android — an Android `intent://` URL with a browser fallback baked in
// Both fall back to the web URL automatically if the app isn't installed
// (iOS via the interstitial timeout, Android via the intent's S.browser
// _fallback_url). Keep this list pragmatic — the big apps people share.

export interface AppDeepLink {
  app: string;       // human label, e.g. "YouTube"
  ios: string;       // scheme/URI to try on iOS
  android: string;   // intent:// URL for Android
}

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

// Builds an Android intent:// URL that opens `pkg` and falls back to the
// original https URL if the app isn't installed.
function androidIntent(httpsUrl: string, pkg: string): string {
  const u = new URL(httpsUrl);
  const hostPath = `${u.host}${u.pathname}${u.search}`;
  return (
    `intent://${hostPath}#Intent;scheme=https;package=${pkg};` +
    `S.browser_fallback_url=${encodeURIComponent(httpsUrl)};end`
  );
}

export function getAppDeepLink(webUrl: string): AppDeepLink | null {
  let u: URL;
  try {
    u = new URL(webUrl);
  } catch {
    return null;
  }
  const host = stripWww(u.hostname.toLowerCase());
  const path = u.pathname;
  const search = u.search;
  const seg = path.split("/").filter(Boolean);

  // ── YouTube ───────────────────────────────────────────────
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    return {
      app: "YouTube",
      ios: `youtube://${u.host}${path}${search}`,
      android: androidIntent(webUrl, "com.google.android.youtube"),
    };
  }

  // ── Instagram ─────────────────────────────────────────────
  if (host === "instagram.com") {
    // Profile (/username) → user deep link; posts/reels open via the app
    // through the same scheme path form.
    const ios =
      seg.length === 1
        ? `instagram://user?username=${seg[0]}`
        : `instagram://${path.replace(/^\//, "")}`;
    return {
      app: "Instagram",
      ios,
      android: androidIntent(webUrl, "com.instagram.android"),
    };
  }

  // ── TikTok ────────────────────────────────────────────────
  if (host === "tiktok.com" || host === "vm.tiktok.com") {
    return {
      app: "TikTok",
      ios: `snssdk1233://${u.host}${path}${search}`,
      android: androidIntent(webUrl, "com.zhiliaoapp.musically"),
    };
  }

  // ── Twitter / X ───────────────────────────────────────────
  if (host === "twitter.com" || host === "x.com") {
    let ios = "twitter://";
    if (seg[0] && seg[1] === "status" && seg[2]) ios = `twitter://status?id=${seg[2]}`;
    else if (seg.length === 1) ios = `twitter://user?screen_name=${seg[0]}`;
    return {
      app: "X",
      ios,
      android: androidIntent(webUrl, "com.twitter.android"),
    };
  }

  // ── Spotify ───────────────────────────────────────────────
  if (host === "open.spotify.com") {
    return {
      app: "Spotify",
      ios: `spotify:${path.replace(/^\//, "").replace(/\//g, ":")}`,
      android: androidIntent(webUrl, "com.spotify.music"),
    };
  }

  // ── Facebook ──────────────────────────────────────────────
  if (host === "facebook.com" || host === "fb.com" || host === "m.facebook.com") {
    return {
      app: "Facebook",
      ios: `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`,
      android: androidIntent(webUrl, "com.facebook.katana"),
    };
  }

  // ── LinkedIn ──────────────────────────────────────────────
  if (host === "linkedin.com") {
    return {
      app: "LinkedIn",
      ios: `linkedin://${path.replace(/^\//, "")}`,
      android: androidIntent(webUrl, "com.linkedin.android"),
    };
  }

  // ── Reddit ────────────────────────────────────────────────
  if (host === "reddit.com") {
    return {
      app: "Reddit",
      ios: `reddit://${u.host}${path}${search}`,
      android: androidIntent(webUrl, "com.reddit.frontpage"),
    };
  }

  // ── Pinterest ─────────────────────────────────────────────
  if (host === "pinterest.com") {
    return {
      app: "Pinterest",
      ios: `pinterest://${path.replace(/^\//, "")}`,
      android: androidIntent(webUrl, "com.pinterest"),
    };
  }

  // ── Twitch ────────────────────────────────────────────────
  if (host === "twitch.tv") {
    return {
      app: "Twitch",
      ios: `twitch://stream/${seg[0] ?? ""}`,
      android: androidIntent(webUrl, "tv.twitch.android.app"),
    };
  }

  // ── Telegram ──────────────────────────────────────────────
  if (host === "t.me" || host === "telegram.me") {
    return {
      app: "Telegram",
      ios: `tg://resolve?domain=${seg[0] ?? ""}`,
      android: androidIntent(webUrl, "org.telegram.messenger"),
    };
  }

  return null;
}
