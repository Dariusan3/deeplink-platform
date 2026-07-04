import type { SupabaseClient } from "@supabase/supabase-js";

// Data-retention helper (GDPR Art. 5(1)(e), storage limitation).
// Anonymises the identifying fields — IP address and user-agent — on click and
// A/B events older than `retentionDays`, while KEEPING the row so aggregate
// analytics (country, device, daily trend) still work. This matches the
// retention promise in the privacy policy: "IP addresses are automatically
// removed while aggregate, non-identifying counts may be kept."
//
// Lives in a shared lib so it can run both from the standalone endpoint
// (/api/cron/prune-click-logs) and piggybacked on the existing daily
// anomaly-check cron — the project is on Vercel Hobby, which caps scheduled
// jobs, so we don't rely on a second cron entry to make retention happen.
export const CLICK_LOG_RETENTION_DAYS = 90;

export async function pruneClickLogs(
  supabase: SupabaseClient,
  retentionDays: number = CLICK_LOG_RETENTION_DAYS
): Promise<{ cutoff: string; results: Record<string, string> }> {
  const cutoff = new Date(
    Date.now() - retentionDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const results: Record<string, string> = {};

  // link_clicks — timestamped by `clicked_at`.
  {
    const { error } = await supabase
      .from("link_clicks")
      .update({ ip_address: null, user_agent: null })
      .lt("clicked_at", cutoff)
      .not("ip_address", "is", null);
    results.link_clicks = error ? `error: ${error.message}` : "anonymised";
  }

  // ab_test_events — timestamped by `created_at`. Isolated so a schema
  // mismatch here doesn't fail the whole job.
  {
    const { error } = await supabase
      .from("ab_test_events")
      .update({ ip_address: null, user_agent: null })
      .lt("created_at", cutoff)
      .not("ip_address", "is", null);
    results.ab_test_events = error ? `error: ${error.message}` : "anonymised";
  }

  return { cutoff, results };
}
