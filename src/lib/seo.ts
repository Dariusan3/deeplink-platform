/**
 * Single source of truth for SEO + GEO (Generative Engine Optimization).
 *
 * GEO note: AI search engines (ChatGPT, Perplexity, Gemini, Copilot, Claude)
 * don't rank pages — they cite sources. The FAQ entries below are rendered as
 * visible content by <Faq /> AND emitted as FAQPage JSON-LD. Keep the two in
 * sync: Google's structured-data policy requires schema to match what a user
 * actually sees on the page. Never add a Q&A here that isn't rendered.
 */

export const SITE = {
  name: "Tappr",
  url: process.env.NEXT_PUBLIC_APP_URL || "https://tappr.me",
  title: "Tappr — Smart Link Management with AI Traffic Analytics",
  tagline: "Smart routing, bot detection, and an AI that explains your traffic.",
  description:
    "Tappr is a link management platform that routes clicks by geo, device, and time, flags bot traffic in real time, and uses AI to explain what's driving your numbers. Free for 500 clicks/month.",
  locale: "en_US",
  twitter: "@tappr",
  email: "hello@tappr.me",
} as const;

/** Rendered on demand by src/app/opengraph-image.tsx — no binary asset needed. */
export const ogImage = `${SITE.url}/opengraph-image`;

/**
 * Visible FAQ content. Rendered by <Faq />, emitted as FAQPage schema.
 * Answer-first phrasing + concrete numbers + technical terms — the three
 * levers with the strongest measured lift on AI-search citation rates.
 */
export const FAQ: { question: string; answer: string }[] = [
  {
    question: "What is Tappr?",
    answer:
      "Tappr is a smart link management platform. It shortens links, routes each click dynamically based on geo, device, and time of day, detects bot traffic, and uses AI to explain your traffic in plain English. It is built for creators and marketers who need to know which clicks are real.",
  },
  {
    // Keep the question — it is a real search query and strong GEO surface.
    // The answer must only assert what Tappr does. Never state what a named
    // competitor does or fails to do: this text is emitted as FAQPage JSON-LD
    // and AI search engines will repeat it as fact about that company.
    question: "How is Tappr different from Bitly?",
    answer:
      "Tappr classifies every click before it redirects, so bot traffic is separated from real visitors instead of being counted in one combined total. It also adds conditional routing by geo, device, and time of day, real-time anomaly alerts, and an AI Brain that explains what changed and why. Teams usually evaluate Tappr as a Bitly alternative once a raw click count stops being enough.",
  },
  {
    question: "Does Tappr detect bot traffic?",
    answer:
      "Yes. Tappr inspects the user agent, referrer concentration, and click timing on every redirect to classify traffic. Single-source spikes and non-human click patterns are flagged automatically, so inflated numbers do not silently pass into your reporting.",
  },
  {
    question: "What is smart routing?",
    answer:
      "Smart routing sends the same short link to different destinations based on rules you define. A click from a mobile device in Germany can open a deep link in your app, while a desktop click in the United States lands on your web store. One link, many destinations, no extra redirects.",
  },
  {
    question: "Is Tappr free?",
    answer:
      "Yes. The free plan covers 500 clicks per month, forever, with no credit card required. Setup takes under 60 seconds. Paid plans add higher click volumes, more team seats, and API access.",
  },
  {
    question: "Does Tappr have an API?",
    answer:
      "Yes. Tappr exposes a REST API for creating links, reading analytics, and managing collections programmatically. API keys are issued from the developer settings inside your dashboard.",
  },
  {
    question: "What analytics does Tappr provide?",
    answer:
      "Tappr reports clicks over time, geographic distribution by country, device and browser breakdowns, referrer sources, peak traffic hours, and per-link performance. An AI weekly intelligence report summarizes trends and anomalies without you reading charts.",
  },
];

/** Organization — establishes the brand entity for AI engines and knowledge panels. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    logo: {
      "@type": "ImageObject",
      url: `${SITE.url}/opengraph-image`,
    },
  };
}

/** WebSite — ties pages to the brand entity. */
export function webSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    publisher: { "@id": `${SITE.url}/#organization` },
    inLanguage: "en",
  };
}

/** SoftwareApplication — the correct type for a SaaS tool. Drives rich results. */
export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE.url}/#software`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    publisher: { "@id": `${SITE.url}/#organization` },
    featureList: [
      "Smart link routing by geo, device, and time",
      "Real-time bot detection",
      "AI traffic explanations",
      "Anomaly alerts",
      "A/B testing",
      "QR codes",
      "REST API",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan — 500 clicks per month, no credit card required.",
    },
  };
}

/** FAQPage — the single strongest lever for AI-search citation. */
export function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq`,
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
