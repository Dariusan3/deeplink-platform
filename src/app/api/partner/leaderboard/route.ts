import { NextResponse } from "next/server";
import { createClient as createSsr } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Returns top 10 partners by total_earned (anonymous, just position + amount)
// plus the calling partner's own rank if not in the top 10.
export async function GET() {
  const ssr = await createSsr();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData?.user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // Pull all partners ordered by total_earned. For Hobby scale this stays
  // tiny; if it grows past a few thousand we'd switch to a top-N + a
  // separate "find my rank" query.
  const { data: rows } = await admin
    .from("partner_profiles")
    .select("id, user_id, total_earned")
    .order("total_earned", { ascending: false });

  const all = rows ?? [];
  const myIdx = all.findIndex((r) => r.user_id === authData.user.id);
  const myRank = myIdx >= 0 ? myIdx + 1 : null;

  const top = all.slice(0, 10).map((r, i) => ({
    rank: i + 1,
    partner_id: r.id,
    amount: Number(r.total_earned),
    is_me: r.user_id === authData.user.id,
  }));

  return NextResponse.json({ entries: top, myRank });
}
