import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/partner/referral-activity
//
// For the calling partner, returns how many links each referred user has
// created in Tappr — an engagement signal ("is this referral actually
// using the product?"). Service role so we can count links created_by a
// user the partner isn't on a team with (RLS would otherwise hide them).
export async function GET() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "server" }, { status: 500 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Resolve the partner profile for the caller.
  const { data: profile } = await admin
    .from("partner_profiles")
    .select("id")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "not a partner" }, { status: 403 });

  // Get this partner's referred users.
  const { data: refs } = await admin
    .from("partner_referrals")
    .select("referred_user_id")
    .eq("partner_id", profile.id);

  const userIds = [...new Set((refs ?? []).map((r) => r.referred_user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) return NextResponse.json({ linkCounts: {} });

  // Count links per referred user (one query, grouped in JS).
  const { data: links } = await admin
    .from("links")
    .select("created_by")
    .in("created_by", userIds);

  const linkCounts: Record<string, number> = {};
  for (const l of (links ?? []) as { created_by: string }[]) {
    linkCounts[l.created_by] = (linkCounts[l.created_by] ?? 0) + 1;
  }

  return NextResponse.json({ linkCounts });
}
