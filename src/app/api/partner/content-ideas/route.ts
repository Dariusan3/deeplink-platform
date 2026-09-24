import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient as createSsr } from "@/lib/supabase/server";

// POST /api/partner/content-ideas { platform, format, niche, audience, tone, link }
//
// Generates ready-to-post content ideas for a partner promoting Tappr. Replaces
// the static Promo Kit. The system prompt carries the same ground rules as
// docs/partner-content-kit-ro.md — most importantly the list of things a partner
// must NOT claim (discounts, trials, fake numbers, unbuilt features).
//
// Partner-only, and rate limited per user because every call spends model tokens.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 20;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

const SYSTEM_PROMPT = `You are a content strategist helping an affiliate partner promote Tappr (tappr.me). Write in Romanian, natural and human, short concrete sentences, no hype.

WHAT TAPPR IS (only claim this):
- Smart link platform. Not just a shortener: it routes, detects fake traffic and explains what happens.
- Smart Routing: one link goes to different places by country, device, time or weekday (e.g. US mobile -> App Store, Romania -> local store).
- Bot detection: clicks are classified before redirect; you see real vs fake traffic.
- Real-time alerts when an important link dies or traffic spikes oddly.
- AI Brain: ask in plain words ("why did traffic to /promo drop?") and get the cause plus what to do.
- A/B testing with automatic winner. Deep linking that opens native apps (100+). Real-time analytics.
- Core hook: "You got 2,400 clicks. How many were real? 600 real, 1,800 bots." Other shorteners tell you HOW MANY clicks; Tappr tells you how many were REAL.
- Three pains: (1) your best link died and you don't know, (2) half your "viral" traffic is bots, (3) you miss your goal and find out too late.
- For creators, people running paid ads, entrepreneurs, online stores, agencies.
- Invite-only: accounts can only be created through a partner's link. Starts free, no card. Free plan: 100 clicks/month, 5 links. Paid: Starter EUR 97, Growth EUR 297, Agency EUR 997 per month.

HARD RULES, never break them:
- NO discounts or promo codes. NO free trial or "2 weeks free". The account is simply Free.
- NO testimonials, customer names, user counts or "trusted by". The product is Beta.
- NO income promises ("earn X", "passive income"). Never mention commission.
- NEVER mention QR codes, custom domains or Instagram connect. NEVER name competing products.
- No certifications or guarantees.
- Say it is a partner link when relevant.

OUTPUT: give exactly 5 ideas. For each: a title, the hook (first line), the structure/scenes, on-screen text, caption, and a CTA that includes the partner's link. Adapt to the requested platform, format, niche, audience and tone. Use plain text with simple headings, no tables.`;

export async function POST(request: NextRequest) {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await ssr
    .from("users")
    .select("is_partner")
    .eq("id", authData.user.id)
    .single();
  if (!profile?.is_partner) {
    return NextResponse.json({ error: "Partners only" }, { status: 403 });
  }

  if (isRateLimited(authData.user.id)) {
    return NextResponse.json(
      { error: "Ai generat multe idei deja. Încearcă din nou peste puțin timp." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const platform = clip(body.platform, 40) || "Instagram";
  const format = clip(body.format, 40) || "Reels";
  const niche = clip(body.niche, 200);
  const audience = clip(body.audience, 200);
  const tone = clip(body.tone, 40) || "direct";
  const link = clip(body.link, 200);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const userPrompt = [
    `Platformă: ${platform}`,
    `Format: ${format}`,
    `Nișa mea: ${niche || "(nespecificată, propune ceva general)"}`,
    `Publicul meu: ${audience || "(nespecificat)"}`,
    `Ton: ${tone}`,
    `Link-ul meu de partener: ${link || "(îl pune partenerul)"}`,
    "",
    "Dă-mi 5 idei de content gata de folosit.",
  ].join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.8,
      max_tokens: 2500,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return NextResponse.json({ error: "Nu am primit niciun răspuns. Încearcă din nou." }, { status: 502 });
    }
    return NextResponse.json({ ideas: text });
  } catch (err) {
    console.error("[partner/content-ideas] generation failed", err);
    return NextResponse.json({ error: "Generarea a eșuat. Încearcă din nou." }, { status: 502 });
  }
}
