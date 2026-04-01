import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import { sendAnomalyEmail } from "@/lib/email";

// Uses service role key — this route is called by a cron scheduler, not a browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DetectedAnomaly {
  team_id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affected_link?: string;
  change_percent?: number;
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all teams with active links
  const { data: teams } = await supabase
    .from("teams")
    .select("id");

  if (!teams || teams.length === 0) {
    return NextResponse.json({ checked: 0, anomalies: 0 });
  }

  const allAnomalies: DetectedAnomaly[] = [];

  for (const team of teams) {
    // Get team's link IDs
    const { data: links } = await supabase
      .from("links")
      .select("id, slug, title")
      .eq("team_id", team.id)
      .eq("is_active", true);

    if (!links || links.length === 0) continue;

    const linkIds = links.map((l) => l.id);

    // Recent 2h clicks
    const { count: recentClicks } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", twoHoursAgo.toISOString());

    // Previous 2h clicks
    const { count: prevClicks } = await supabase
      .from("link_clicks")
      .select("*", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("clicked_at", fourHoursAgo.toISOString())
      .lt("clicked_at", twoHoursAgo.toISOString());

    const recent = recentClicks ?? 0;
    const prev = prevClicks ?? 0;

    // Detect traffic spike/drop
    if (prev > 0 || recent > 0) {
      const changePercent = prev === 0
        ? (recent > 0 ? 100 : 0)
        : ((recent - prev) / prev) * 100;

      if (Math.abs(changePercent) >= 40) {
        const isDrop = changePercent < 0;
        allAnomalies.push({
          team_id: team.id,
          severity: Math.abs(changePercent) >= 70 ? "high" : "medium",
          title: isDrop ? "Traffic Drop Detected" : "Unusual Traffic Spike",
          description: isDrop
            ? `Click volume dropped ${Math.abs(changePercent).toFixed(0)}% in the last 2 hours vs previous 2 hours. Possible causes: deleted social post, link paused, or campaign ended.`
            : `Click volume surged ${changePercent.toFixed(0)}% in the last 2 hours. Something is driving unexpected traffic — check referrers.`,
          change_percent: changePercent,
        });
      }
    }

    // Detect "Link Gone Silent" — per-link check for top links
    const topLinks = links.slice(0, 5);
    for (const link of topLinks) {
      // Recent 2h for this link
      const { count: linkRecent } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", link.id)
        .gte("clicked_at", twoHoursAgo.toISOString());

      // 7-day history for avg per 2h window
      const { count: linkHistory } = await supabase
        .from("link_clicks")
        .select("*", { count: "exact", head: true })
        .eq("link_id", link.id)
        .gte("clicked_at", sevenDaysAgo.toISOString());

      const avgPer2h = (linkHistory ?? 0) / 84; // 84 two-hour windows in 7 days

      if ((linkRecent ?? 0) === 0 && avgPer2h > 5) {
        allAnomalies.push({
          team_id: team.id,
          severity: "medium",
          title: "Link Gone Silent",
          description: `"${link.title || link.slug}" had 0 clicks in the last 2 hours but averages ${avgPer2h.toFixed(0)}/2hr. Check if source content was removed.`,
          affected_link: link.slug,
        });
      }
    }
  }

  if (allAnomalies.length === 0) {
    return NextResponse.json({ checked: teams.length, anomalies: 0 });
  }

  // Enhance with AI (batch all anomalies)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const enhancePrompt = `Anomalies detected in a link management platform:
${JSON.stringify(allAnomalies.map((a) => ({ title: a.title, description: a.description })), null, 2)}

For each anomaly, provide ONE likely root cause and ONE immediate action in JSON format:
{"enhanced": [{"rootCause": "...", "action": "..."}]}

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
          allAnomalies.forEach((a, i) => {
            if (enhanced.enhanced[i]) {
              (a as any).root_cause = enhanced.enhanced[i].rootCause;
              (a as any).action = enhanced.enhanced[i].action;
            }
          });
        }
      }
    } catch {
      // AI enhancement failed silently — save basic anomalies
    }
  }

  // Deduplicate: don't insert if same team+title exists in last 4 hours
  const insertAnomalies = [];
  for (const anomaly of allAnomalies) {
    const { count } = await supabase
      .from("anomaly_alerts")
      .select("*", { count: "exact", head: true })
      .eq("team_id", anomaly.team_id)
      .eq("title", anomaly.title)
      .gte("created_at", fourHoursAgo.toISOString());

    if ((count ?? 0) === 0) {
      insertAnomalies.push({
        team_id: anomaly.team_id,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        root_cause: (anomaly as any).root_cause || null,
        action: (anomaly as any).action || null,
        affected_link: anomaly.affected_link || null,
        change_percent: anomaly.change_percent || null,
      });
    }
  }

  if (insertAnomalies.length > 0) {
    const { error } = await supabase.from("anomaly_alerts").insert(insertAnomalies);
    if (error) {
      console.error("Failed to insert anomaly alerts:", error.message);
    }

    // Send email for high-severity anomalies
    const highSeverity = insertAnomalies.filter((a) => a.severity === "high");
    for (const alert of highSeverity) {
      // Get team owner's email
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", alert.team_id)
        .eq("role", "owner");

      const { data: teamData } = await supabase
        .from("teams")
        .select("name")
        .eq("id", alert.team_id)
        .single();

      if (members && teamData) {
        for (const member of members) {
          const { data: userData } = await supabase
            .from("users")
            .select("email")
            .eq("id", member.user_id)
            .single();

          if (userData?.email) {
            await sendAnomalyEmail({
              to: userData.email,
              teamName: teamData.name,
              severity: alert.severity,
              title: alert.title,
              description: alert.description,
              rootCause: alert.root_cause,
              action: alert.action,
            });
          }
        }
      }
    }
  }

  return NextResponse.json({
    checked: teams.length,
    detected: allAnomalies.length,
    saved: insertAnomalies.length,
  });
}
