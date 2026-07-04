import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pruneClickLogs, CLICK_LOG_RETENTION_DAYS } from "@/lib/prune-click-logs";

// GET /api/cron/prune-click-logs
//
// Standalone data-retention endpoint. The pruning also runs automatically as
// part of the daily anomaly-check cron (see that route) — because Vercel Hobby
// caps scheduled jobs, retention doesn't depend on a second cron entry. This
// endpoint stays for manual runs and external schedulers.
//
// Auth: same Bearer CRON_SECRET pattern as the other cron routes.

// Lazy service-role client — `next build` imports this module for page-data
// collection, and an eager top-level client throws when the key is absent.
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cutoff, results } = await pruneClickLogs(getSupabase());

  return NextResponse.json({
    ok: true,
    retentionDays: CLICK_LOG_RETENTION_DAYS,
    cutoff,
    results,
  });
}
