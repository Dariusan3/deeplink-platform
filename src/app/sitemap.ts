import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Only publicly indexable marketing/legal pages. Dashboard, admin, partner,
 * auth and billing routes are gated and disallowed in robots.ts, so listing
 * them here would contradict that and waste crawl budget.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/pricing`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE.url}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE.url}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
