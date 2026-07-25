import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasFeature } from "@/lib/entitlements";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/settings?ig_error=no_code", request.url));
  }

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
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Get active team from localStorage is not possible server-side,
  // so we fetch the first team the user belongs to
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.redirect(new URL("/dashboard/settings?ig_error=no_team", request.url));
  }

  // Instagram integration is a paid feature (Starter and above).
  const { data: team } = await supabase
    .from("teams")
    .select("plan")
    .eq("id", membership.team_id)
    .single();
  if (!hasFeature(team?.plan, "instagram")) {
    return NextResponse.redirect(new URL("/dashboard/settings?ig_error=plan", request.url));
  }

  try {
    // Exchange code for short-lived token (new Instagram API with Instagram Login)
    const redirectUri = `${request.nextUrl.origin}/api/ig/callback`;
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_IG_APP_ID!,
        client_secret: process.env.IG_APP_SECRET!,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("IG token exchange failed:", err);
      return NextResponse.redirect(new URL("/dashboard/settings?ig_error=token_failed", request.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token: shortToken, user_id: igUserId } = tokenData;

    // Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.IG_APP_SECRET}&access_token=${shortToken}`
    );

    let accessToken = shortToken;
    let expiresAt: string | null = null;

    if (longTokenRes.ok) {
      const longData = await longTokenRes.json();
      accessToken = longData.access_token;
      const expiresIn = longData.expires_in || 5184000; // 60 days default
      expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    }

    // Fetch username via new Instagram Graph API
    const profileRes = await fetch(
      `https://graph.instagram.com/v22.0/me?fields=user_id,username&access_token=${accessToken}`
    );
    let igUsername = igUserId;
    if (profileRes.ok) {
      const profileData = await profileRes.json();
      igUsername = profileData.username || igUserId;
    }

    // Deactivate existing integrations for this team
    await supabase
      .from("ig_integrations")
      .update({ is_active: false })
      .eq("team_id", membership.team_id);

    // Save new integration
    const { error: insertError } = await supabase
      .from("ig_integrations")
      .insert({
        team_id: membership.team_id,
        ig_user_id: String(igUserId),
        ig_username: igUsername,
        access_token: accessToken,
        token_expires_at: expiresAt,
        is_active: true,
      });

    if (insertError) {
      console.error("Failed to save IG integration:", insertError);
      return NextResponse.redirect(new URL("/dashboard/settings?ig_error=save_failed", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard/settings?ig_connected=true", request.url));
  } catch (err) {
    console.error("IG callback error:", err);
    return NextResponse.redirect(new URL("/dashboard/settings?ig_error=unknown", request.url));
  }
}
