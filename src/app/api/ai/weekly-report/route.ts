import { NextRequest, NextResponse } from "next/server";
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId, analyticsData } = await request.json();

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const prompt = `Generate a comprehensive Weekly Intelligence Report for a smart link management platform.

Analytics data for the past 7 days (${weekAgo.toDateString()} — ${now.toDateString()}):
${JSON.stringify(analyticsData, null, 2)}

Write a professional narrative report as a senior marketing analyst would. Structure it as:

## Weekly Intelligence Report
### Executive Summary (2-3 sentences, key headline metric)
### What Worked (top wins, best-performing links, peak moments)
### What Fell (drops, underperforming areas, anomalies detected)
### New Audiences Captured (new geo/device trends)
### This Week's Action Items (3-5 specific, concrete recommendations)
### Forecast (what to expect next week based on trends)

Be specific with numbers. Write like a human analyst, not a bot. Max 400 words.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const reportText = response.choices[0]?.message?.content ?? "";

    // Save to weekly_reports table
    await supabase.from("weekly_reports").insert({
      team_id: teamId,
      period_start: weekAgo.toISOString(),
      period_end: now.toISOString(),
      report_data: { narrative: reportText, analytics: analyticsData },
    });

    return NextResponse.json({ report: reportText });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
