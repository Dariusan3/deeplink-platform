import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * AI search engines only cite what they can crawl. Each one uses a distinct
 * user agent, and a bare `User-agent: *` rule is not always enough — several
 * of these bots look for an explicit allow. List them by name.
 *
 * Private surfaces (dashboard, admin, partner, auth, billing, API) are
 * disallowed.
 *
 * Short links are NOT blocked here and cannot be: `/[slug]` lives at the root,
 * the same namespace as `/pricing`, so no path prefix isolates it. They are
 * 302 redirects rather than HTML, so crawlers follow them to the destination
 * instead of indexing the short URL. If crawler hits ever pollute click
 * analytics, filter them in the redirect handler by user agent — not here.
 */
const AI_BOTS = [
  "GPTBot", // OpenAI training + ChatGPT
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT browsing on user request
  "PerplexityBot", // Perplexity index
  "Perplexity-User", // Perplexity browsing
  "ClaudeBot", // Anthropic index
  "Claude-User",
  "anthropic-ai",
  "Google-Extended", // Gemini / AI Overviews
  "Applebot-Extended",
  "cohere-ai",
  "meta-externalagent",
];

const DISALLOW = [
  "/dashboard/",
  "/admin/",
  "/partner/",
  "/billing/",
  "/api/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/paused",
  "/tiktok-open",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Traditional crawlers.
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      // AI engines — explicit allow so they may cite the marketing pages.
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
