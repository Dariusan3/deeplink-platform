import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAllDetectors, persistDetections, type DetectedAlert } from "@/lib/alert-detectors";

// Vercel cron: scans every team on a 3-hour cadence and inserts alerts +
// re-verifies acked ones. Manual user-initiated checks go through
// /api/alerts/check (no rate limit, scoped to active team).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: teams } = await supabase.from("teams").select("id, plan");
  if (!teams || teams.length === 0) {
    return NextResponse.json({ teams: 0, alerts: 0 });
  }

  const all: DetectedAlert[] = [];
  for (const team of teams) {
    all.push(...await runAllDetectors(supabase, team));
  }
  const inserted = await persistDetections(supabase, teams.map((t) => t.id), all);

  return NextResponse.json({ teams: teams.length, detected: all.length, inserted });
}
