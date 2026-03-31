import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!teamId) {
    return NextResponse.json({ error: "teamId required" }, { status: 400 });
  }

  // Fetch active IG integration for team
  const { data: integration, error: igError } = await supabase
    .from("ig_integrations")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (igError || !integration) {
    return NextResponse.json({ error: "No active Instagram integration" }, { status: 404 });
  }

  // Check if token is expired
  if (integration.token_expires_at) {
    const expiresAt = new Date(integration.token_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ error: "Instagram token expired. Please reconnect." }, { status: 401 });
    }
  }

  const accessToken = integration.access_token;
  const igUserId = integration.ig_user_id;

  try {
    // Fetch user profile info (followers, media count)
    const profileRes = await fetch(
      `https://graph.instagram.com/v22.0/me?fields=user_id,username,account_type,media_count,followers_count,follows_count&access_token=${accessToken}`
    );

    let profile = null;
    if (profileRes.ok) {
      profile = await profileRes.json();
    }

    // Fetch profile insights (profile_views, impressions, reach) — last 30 days
    // Uses the Instagram Insights API for Business/Creator accounts
    const period = "day";
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);

    const insightsRes = await fetch(
      `https://graph.instagram.com/v22.0/${igUserId}/insights?metric=profile_views,impressions,reach&period=${period}&since=${since}&until=${until}&access_token=${accessToken}`
    );

    let insights = null;
    let dailyProfileViews: { date: string; value: number }[] = [];
    let totalProfileViews = 0;
    let totalImpressions = 0;
    let totalReach = 0;

    if (insightsRes.ok) {
      const insightsData = await insightsRes.json();
      insights = insightsData.data;

      // Parse profile_views daily values
      for (const metric of insights || []) {
        if (metric.name === "profile_views") {
          for (const val of metric.values || []) {
            totalProfileViews += val.value || 0;
            dailyProfileViews.push({
              date: val.end_time?.split("T")[0] || "",
              value: val.value || 0,
            });
          }
        }
        if (metric.name === "impressions") {
          for (const val of metric.values || []) {
            totalImpressions += val.value || 0;
          }
        }
        if (metric.name === "reach") {
          for (const val of metric.values || []) {
            totalReach += val.value || 0;
          }
        }
      }
    } else {
      const errText = await insightsRes.text();
      console.error("IG insights error:", insightsRes.status, errText);
    }

    return NextResponse.json({
      profile: {
        username: profile?.username || integration.ig_username,
        accountType: profile?.account_type,
        followers: profile?.followers_count ?? null,
        following: profile?.follows_count ?? null,
        mediaCount: profile?.media_count ?? null,
      },
      insights: {
        profileViews: totalProfileViews,
        impressions: totalImpressions,
        reach: totalReach,
        dailyProfileViews,
      },
    });
  } catch (err) {
    console.error("IG insights fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch Instagram insights" }, { status: 500 });
  }
}
