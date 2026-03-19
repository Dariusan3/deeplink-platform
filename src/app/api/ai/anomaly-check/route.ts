import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface AnomalyResult {
  detected: boolean;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affectedLink?: string;
  changePercent?: number;
}

export async function POST(request: NextRequest) {
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recentHours, previousHours, topLinks } = await request.json();

  const anomalies: AnomalyResult[] = [];

  if (recentHours !== undefined && previousHours !== undefined) {
    const changePercent = previousHours === 0
      ? (recentHours > 0 ? 100 : 0)
      : ((recentHours - previousHours) / previousHours) * 100;

    if (Math.abs(changePercent) >= 40) {
      const isDrop = changePercent < 0;
      anomalies.push({
        detected: true,
        severity: Math.abs(changePercent) >= 70 ? "high" : "medium",
        title: isDrop ? "Traffic Drop Detected" : "Unusual Traffic Spike",
        description: isDrop
          ? `Click volume dropped ${Math.abs(changePercent).toFixed(0)}% in the last 2 hours vs previous 2 hours. Possible causes: deleted social post, link paused, or campaign ended.`
          : `Click volume surged ${changePercent.toFixed(0)}% in the last 2 hours. Something is driving unexpected traffic — check referrers.`,
        changePercent,
      });
    }
  }

  if (topLinks && Array.isArray(topLinks)) {
    for (const link of topLinks) {
      if (link.recentClicks === 0 && link.avgClicks > 5) {
        anomalies.push({
          detected: true,
          severity: "medium",
          title: "Link Gone Silent",
          description: `"${link.title || link.slug}" had 0 clicks in the last 2 hours but averages ${link.avgClicks.toFixed(0)}/hr. Check if source content was removed.`,
          affectedLink: link.slug,
        });
      }
    }
  }

  if (anomalies.length > 0 && process.env.GROQ_API_KEY) {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    try {
      const enhancePrompt = `Anomalies detected in a link management platform:
${JSON.stringify(anomalies, null, 2)}

For each anomaly, provide ONE likely root cause and ONE immediate action in JSON format:
{"enhanced": [{"title": "...", "rootCause": "...", "action": "..."}]}

Reply with only the JSON, no other text.`;

      const aiResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: 512,
        messages: [{ role: "user", content: enhancePrompt }],
      });

      const text = aiResponse.choices[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enhanced = JSON.parse(jsonMatch[0]);
        if (enhanced.enhanced) {
          anomalies.forEach((a, i) => {
            if (enhanced.enhanced[i]) {
              a.description = `${a.description}\n\n**Root cause:** ${enhanced.enhanced[i].rootCause}\n**Action:** ${enhanced.enhanced[i].action}`;
            }
          });
        }
      }
    } catch {
      // Silent fail — return basic anomalies
    }
  }

  return NextResponse.json({ anomalies });
}
