import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { messages, teamId, analyticsContext } = await request.json();

  const systemPrompt = `You are the AI Brain — a powerful analytics advisor for a smart deep link management platform called DeepLink.

You have access to the following live data for team "${analyticsContext?.teamName || "Unknown"}":

ANALYTICS (last 30 days):
${analyticsContext ? JSON.stringify({
  totalClicks: analyticsContext.totalClicks,
  totalLinks: analyticsContext.totalLinks,
  activeLinks: analyticsContext.activeLinks,
  topLinks: analyticsContext.topLinks,
  topCountries: analyticsContext.topCountries,
  deviceSplit: analyticsContext.deviceSplit,
  topReferrers: analyticsContext.topReferrers,
  dailyTrend: analyticsContext.dailyTrend,
}, null, 2) : "No analytics data available yet."}

ALL LINKS:
${analyticsContext?.links ? JSON.stringify(analyticsContext.links, null, 2) : "No links yet."}

COLLECTIONS:
${analyticsContext?.collections ? JSON.stringify(analyticsContext.collections, null, 2) : "No collections yet."}

Your role:
- Answer questions about SPECIFIC links by slug/title, or SPECIFIC collections by name
- Analyze link performance, traffic patterns, geo/device distribution, and referrers
- Compare collections and their link performance
- Track click goals — tell the user if they're on track or behind
- Detect anomalies and unusual patterns
- Suggest strategic optimizations (best posting times, top-performing link types, audience targeting)
- Forecast trends based on historical data

Be concise, data-driven, and actionable. Format responses with markdown. Use bullet points for lists.
When you see patterns, explain WHY they matter and WHAT to do about them.
Always refer to actual numbers from the analytics data when available.
When asked about a specific link or collection, reference it by name and give detailed insights.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const groqStream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        });

        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "AI error";
        controller.enqueue(encoder.encode(`\n\nError: ${errMsg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
