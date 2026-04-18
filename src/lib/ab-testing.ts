import type { SupabaseClient } from "@supabase/supabase-js";
import { sendABWinnerEmail } from "@/lib/email";

type ABTestRow = {
  id: string;
  team_id: string;
  name: string;
  slug: string;
  status: string;
  variant_a_name: string;
  variant_a_url: string;
  variant_a_visits: number;
  variant_a_conversions: number;
  variant_b_name: string;
  variant_b_url: string;
  variant_b_visits: number;
  variant_b_conversions: number;
  auto_optimize: boolean;
  min_conversions: number;
  threshold_percent: number;
  winner: string | null;
};

export function pickWinner(test: ABTestRow): "a" | "b" | null {
  if (!test.auto_optimize) return null;
  if (test.winner) return null;

  // Gate: at least ONE variant must have hit min_conversions on its own.
  // Matches the product rule: "whichever variant reaches the conversion
  // threshold first wins" — not the sum of both.
  if (
    test.variant_a_conversions < test.min_conversions &&
    test.variant_b_conversions < test.min_conversions
  ) {
    return null;
  }

  const rateA = test.variant_a_visits > 0 ? test.variant_a_conversions / test.variant_a_visits : 0;
  const rateB = test.variant_b_visits > 0 ? test.variant_b_conversions / test.variant_b_visits : 0;

  if (rateA === 0 && rateB === 0) return null;

  const threshold = test.threshold_percent / 100;

  // Multiplicative lead: A wins if rateA > rateB * (1 + threshold).
  // When rateB === 0, rateA > 0 is enough (the guard above already required
  // at least one variant crossed min_conversions).
  if (rateA > rateB * (1 + threshold)) return "a";
  if (rateB > rateA * (1 + threshold)) return "b";
  return null;
}

export async function finalizeABWinnerIfReady(
  supabase: SupabaseClient,
  test: ABTestRow,
  opts: { sendEmail?: boolean } = { sendEmail: true }
): Promise<"a" | "b" | null> {
  const winner = pickWinner(test);
  if (!winner) return null;

  // Conditional update guards against racing visits: only sets winner if
  // another request hasn't already set it.
  const { data, error } = await supabase
    .from("ab_tests")
    .update({
      winner,
      winner_selected_at: new Date().toISOString(),
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", test.id)
    .is("winner", null)
    .select("id")
    .maybeSingle();

  if (error || !data) return null;

  if (opts.sendEmail !== false) {
    await notifyABWinner(supabase, test, winner).catch((err) => {
      console.error("Failed to send A/B winner email:", err);
    });
  }

  return winner;
}

async function notifyABWinner(
  supabase: SupabaseClient,
  test: ABTestRow,
  winner: "a" | "b"
) {
  const { data: members } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", test.team_id)
    .eq("role", "owner");

  const { data: teamData } = await supabase
    .from("teams")
    .select("name")
    .eq("id", test.team_id)
    .single();

  if (!members || !teamData) return;

  const winnerName = winner === "a" ? test.variant_a_name : test.variant_b_name;
  const winnerUrl = winner === "a" ? test.variant_a_url : test.variant_b_url;
  const winnerVisits = winner === "a" ? test.variant_a_visits : test.variant_b_visits;
  const winnerConversions =
    winner === "a" ? test.variant_a_conversions : test.variant_b_conversions;
  const loserName = winner === "a" ? test.variant_b_name : test.variant_a_name;
  const loserVisits = winner === "a" ? test.variant_b_visits : test.variant_a_visits;
  const loserConversions =
    winner === "a" ? test.variant_b_conversions : test.variant_a_conversions;

  for (const member of members) {
    const { data: userData } = await supabase
      .from("users")
      .select("email")
      .eq("id", member.user_id)
      .single();

    if (!userData?.email) continue;

    await sendABWinnerEmail({
      to: userData.email,
      teamName: teamData.name,
      testName: test.name,
      testSlug: test.slug,
      winnerName,
      winnerUrl,
      winnerVisits,
      winnerConversions,
      loserName,
      loserVisits,
      loserConversions,
    });
  }
}
